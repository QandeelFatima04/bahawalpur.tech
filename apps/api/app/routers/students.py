import secrets
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import SessionLocal, get_db
from ..deps import require_role
from ..models import (
    Application,
    ApplicationStatus,
    AuditLog,
    CandidateProfile,
    CandidateProject,
    CandidateSkill,
    CareerReport,
    Company,
    InterviewRequest,
    InterviewStatus,
    Job,
    JobStatus,
    Match,
    ResumeFile,
    User,
    UserRole,
)
from ..schemas import (
    ApplicationCreate,
    ApplicationResponse,
    AsyncJobResponse,
    CareerReportResponse,
    InterviewResponse,
    ProfileResponse,
    ProfileUpsertRequest,
    ProjectIn,
    StudentJobRow,
    VisibilityRequest,
)
from ..services import email as email_service
from ..services.ai import extract_text_from_bytes, generate_career_report, parse_resume
from ..services.matching import recompute_for_job
from ..services.storage import upload_resume

router = APIRouter(prefix="/students", tags=["students"])
settings = get_settings()


def _profile_or_create(db: Session, user_id: int) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
    if profile:
        return profile
    profile = CandidateProfile(user_id=user_id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def _require_active_profile(db: Session, user_id: int) -> CandidateProfile:
    profile = _profile_or_create(db, user_id)
    if profile.is_disabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profile is disabled")
    return profile


def _to_response(profile: CandidateProfile) -> ProfileResponse:
    return ProfileResponse(
        id=profile.id,
        university=profile.university,
        degree=profile.degree,
        graduation_year=profile.graduation_year,
        experience_years=profile.experience_years,
        visibility_flag=profile.visibility_flag,
        summary=profile.summary,
        current_location=profile.current_location,
        linkedin_url=profile.linkedin_url,
        github_url=profile.github_url,
        portfolio_url=profile.portfolio_url,
        skills=[s.name for s in profile.skills],
        projects=[ProjectIn(title=p.title, technologies=p.technologies, description=p.description) for p in profile.projects],
    )


@router.get("/me/profile", response_model=ProfileResponse)
def get_profile(user: User = Depends(require_role(UserRole.student)), db: Session = Depends(get_db)):
    profile = _profile_or_create(db, user.id)
    db.refresh(profile)
    return _to_response(profile)


@router.put("/me/profile", response_model=ProfileResponse)
def upsert_profile(
    payload: ProfileUpsertRequest,
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    profile = _require_active_profile(db, user.id)
    profile.university = payload.university
    profile.degree = payload.degree
    profile.graduation_year = payload.graduation_year
    profile.experience_years = payload.experience_years
    profile.summary = payload.summary
    profile.current_location = payload.current_location
    profile.linkedin_url = payload.linkedin_url
    profile.github_url = payload.github_url
    profile.portfolio_url = payload.portfolio_url
    profile.skills.clear()
    profile.projects.clear()
    for skill in sorted({s.strip() for s in payload.skills if s.strip()}):
        profile.skills.append(CandidateSkill(name=skill))
    for project in payload.projects:
        profile.projects.append(
            CandidateProject(
                title=project.title,
                technologies=project.technologies,
                description=project.description,
            )
        )
    db.commit()
    db.refresh(profile)
    for job in db.query(Job).filter(Job.is_active.is_(True)).all():
        recompute_for_job(db, job.id)
    return _to_response(profile)


@router.patch("/me/visibility", response_model=ProfileResponse)
def update_visibility(
    payload: VisibilityRequest,
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    profile = _require_active_profile(db, user.id)
    profile.visibility_flag = payload.visibility_flag
    db.commit()
    db.refresh(profile)
    for job in db.query(Job).filter(Job.is_active.is_(True)).all():
        recompute_for_job(db, job.id)
    return _to_response(profile)


def _process_resume_task(resume_id: int, text: str):
    db = SessionLocal()
    try:
        resume = db.query(ResumeFile).filter(ResumeFile.id == resume_id).first()
        if not resume:
            return
        resume.status = JobStatus.processing
        resume.started_at = datetime.utcnow()
        db.commit()
        try:
            parsed = parse_resume(text)
            profile = db.query(CandidateProfile).filter(CandidateProfile.id == resume.candidate_id).first()
            if profile:
                profile.summary = parsed.get("summary") or profile.summary
                profile.university = parsed.get("university") or profile.university
                profile.degree = parsed.get("degree") or profile.degree
                profile.graduation_year = parsed.get("graduation_year") or profile.graduation_year
                profile.experience_years = float(parsed.get("experience_years") or 0)
                profile.current_location = parsed.get("current_location") or profile.current_location
                profile.linkedin_url = parsed.get("linkedin_url") or profile.linkedin_url
                profile.github_url = parsed.get("github_url") or profile.github_url
                profile.portfolio_url = parsed.get("portfolio_url") or profile.portfolio_url
                profile.skills.clear()
                for s in sorted({skill.strip() for skill in parsed.get("skills", []) if skill.strip()}):
                    profile.skills.append(CandidateSkill(name=s))
                profile.projects.clear()
                for project in parsed.get("projects", []):
                    profile.projects.append(
                        CandidateProject(
                            title=project.get("title", "Project"),
                            technologies=project.get("technologies", []),
                            description=project.get("description"),
                        )
                    )

                report_payload = generate_career_report(
                    {"summary": profile.summary, "skills": [s.name for s in profile.skills], "projects": parsed.get("projects", [])}
                )
                db.add(AuditLog(actor_user_id=profile.user_id, action="resume_parsed", payload={"resume_id": resume.id}))
                report = db.query(CareerReport).filter(CareerReport.candidate_id == profile.id).first()
                if not report:
                    report = CareerReport(candidate_id=profile.id, **report_payload)
                    db.add(report)
                else:
                    for key, value in report_payload.items():
                        setattr(report, key, value)
                db.add(AuditLog(actor_user_id=profile.user_id, action="career_report_generated", payload={"candidate_id": profile.id}))

                db.commit()
                for job in db.query(Job).filter(Job.is_active.is_(True)).all():
                    recompute_for_job(db, job.id)

            resume.status = JobStatus.completed
            resume.completed_at = datetime.utcnow()
            db.commit()
        except Exception as exc:  # noqa: BLE001
            resume.status = JobStatus.failed
            resume.error = str(exc)
            resume.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


@router.post("/me/resume", response_model=AsyncJobResponse)
def upload_resume_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    allowed = {x.strip().lower() for x in settings.allowed_resume_extensions.split(",")}
    if ext not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported resume format")

    contents = file.file.read()
    if len(contents) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    profile = _require_active_profile(db, user.id)
    s3_key = upload_resume(contents, file.filename, file.content_type or "application/octet-stream")
    resume = ResumeFile(
        candidate_id=profile.id,
        original_filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        s3_key=s3_key,
        size_bytes=len(contents),
        status=JobStatus.pending,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    text = extract_text_from_bytes(contents, file.content_type or "", file.filename or "")
    background_tasks.add_task(_process_resume_task, resume.id, text)
    return AsyncJobResponse(
        id=resume.id,
        status=resume.status.value,
        started_at=resume.started_at,
        completed_at=resume.completed_at,
        error=resume.error,
    )


@router.get("/me/resume/{resume_id}/status", response_model=AsyncJobResponse)
def resume_status(
    resume_id: int,
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    profile = _profile_or_create(db, user.id)
    resume = db.query(ResumeFile).filter(ResumeFile.id == resume_id, ResumeFile.candidate_id == profile.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return AsyncJobResponse(
        id=resume.id,
        status=resume.status.value,
        started_at=resume.started_at,
        completed_at=resume.completed_at,
        error=resume.error,
    )


@router.get("/me/report", response_model=CareerReportResponse)
def get_report(
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    profile = _profile_or_create(db, user.id)
    report = db.query(CareerReport).filter(CareerReport.candidate_id == profile.id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not generated yet")
    return CareerReportResponse(
        professional_summary=report.professional_summary,
        suggested_paths=report.suggested_paths,
        skill_gaps=report.skill_gaps,
        resume_suggestions=report.resume_suggestions,
    )


@router.get("/me/jobs", response_model=list[StudentJobRow])
def browse_jobs(
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
    min_score: float | None = None,
    location: str | None = None,
    skill: str | None = None,
):
    profile = _profile_or_create(db, user.id)
    q = (
        db.query(Job, Company)
        .join(Company, Company.id == Job.company_id)
        .filter(Job.is_active.is_(True))
        .filter(Company.is_disabled.is_(False))
    )
    if location:
        q = q.filter(Job.location.ilike(f"%{location}%"))
    rows = q.all()

    matches_by_job = {
        m.job_id: m
        for m in db.query(Match).filter(Match.candidate_id == profile.id).all()
    }
    applied_job_ids = {
        a.job_id
        for a in db.query(Application)
        .filter(Application.candidate_id == profile.id)
        .filter(Application.status == ApplicationStatus.applied)
        .all()
    }

    candidate_skills_lower = {s.name.strip().lower() for s in profile.skills}

    output: list[StudentJobRow] = []
    for job, company in rows:
        skill_names = [s.name for s in job.skills]
        if skill and not any(skill.lower() in s.lower() for s in skill_names):
            continue
        m = matches_by_job.get(job.id)
        total = m.total_score if m else 0.0
        if min_score is not None and total < min_score:
            continue
        missing = [s for s in skill_names if s.strip().lower() not in candidate_skills_lower]
        output.append(
            StudentJobRow(
                id=job.id,
                company_id=company.id,
                company_name=company.name,
                title=job.title,
                required_skills=skill_names,
                missing_skills=missing,
                experience_level=job.experience_level,
                education_requirement=job.education_requirement,
                location=job.location,
                description=job.description,
                apply_threshold=job.apply_threshold,
                total_score=total,
                skill_score=m.skill_score if m else 0.0,
                project_score=m.project_score if m else 0.0,
                education_score=m.education_score if m else 0.0,
                experience_score=m.experience_score if m else 0.0,
                already_applied=job.id in applied_job_ids,
            )
        )
    output.sort(key=lambda r: r.total_score, reverse=True)
    return output


@router.post("/me/applications", response_model=ApplicationResponse)
def apply_to_job(
    payload: ApplicationCreate,
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    profile = _require_active_profile(db, user.id)
    if not profile.visibility_flag:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Enable profile visibility before applying",
        )
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job or not job.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found or inactive")

    recompute_for_job(db, job.id)
    match = (
        db.query(Match)
        .filter(Match.candidate_id == profile.id, Match.job_id == job.id)
        .first()
    )
    total_score = match.total_score if match else 0.0

    if total_score < job.apply_threshold:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "below_threshold",
                "message": f"Match score {total_score:.1f}% is below this job's required {job.apply_threshold:.0f}%",
                "total_score": total_score,
                "apply_threshold": job.apply_threshold,
            },
        )

    existing = (
        db.query(Application)
        .filter(Application.candidate_id == profile.id, Application.job_id == job.id)
        .first()
    )
    if existing:
        existing.status = ApplicationStatus.applied
        existing.match_score_at_apply = total_score
        db.commit()
        application = existing
    else:
        application = Application(
            candidate_id=profile.id,
            job_id=job.id,
            status=ApplicationStatus.applied,
            match_score_at_apply=total_score,
        )
        db.add(application)
        db.commit()
        db.refresh(application)

    company = db.query(Company).filter(Company.id == job.company_id).first()
    return ApplicationResponse(
        id=application.id,
        job_id=job.id,
        job_title=job.title,
        company_name=company.name if company else "",
        status=application.status.value,
        match_score_at_apply=application.match_score_at_apply,
        created_at=application.created_at,
    )


@router.get("/me/applications", response_model=list[ApplicationResponse])
def list_applications(
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    profile = _profile_or_create(db, user.id)
    rows = (
        db.query(Application, Job, Company)
        .join(Job, Job.id == Application.job_id)
        .join(Company, Company.id == Job.company_id)
        .filter(Application.candidate_id == profile.id)
        .order_by(desc(Application.created_at))
        .all()
    )
    return [
        ApplicationResponse(
            id=a.id,
            job_id=j.id,
            job_title=j.title,
            company_name=c.name,
            status=a.status.value,
            match_score_at_apply=a.match_score_at_apply,
            created_at=a.created_at,
        )
        for a, j, c in rows
    ]


@router.get("/me/interviews", response_model=list[InterviewResponse])
def list_interviews(
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    profile = _profile_or_create(db, user.id)
    rows = (
        db.query(InterviewRequest, Job, Company)
        .join(Job, Job.id == InterviewRequest.job_id)
        .join(Company, Company.id == InterviewRequest.company_id)
        .filter(InterviewRequest.candidate_id == profile.id)
        .order_by(desc(InterviewRequest.interview_date))
        .all()
    )
    return [
        InterviewResponse(
            id=i.id,
            candidate_id=i.candidate_id,
            company_id=i.company_id,
            company_name=c.name,
            job_id=j.id,
            job_title=j.title,
            interview_date=i.interview_date,
            status=i.status.value,
            hire_status=i.hire_status.value if i.hire_status else None,
            meeting_link=i.meeting_link,
            created_at=i.created_at,
        )
        for i, j, c in rows
    ]


def _make_meeting_link(interview_id: int) -> str:
    """Stable, unguessable Jitsi Meet URL. Same link for both parties; no account required."""
    token = secrets.token_urlsafe(8)
    return f"https://meet.jit.si/careerbridge-interview-{interview_id}-{token}"


def _transition_interview(db: Session, profile_id: int, interview_id: int, target: InterviewStatus) -> InterviewRequest:
    interview = (
        db.query(InterviewRequest)
        .filter(InterviewRequest.id == interview_id, InterviewRequest.candidate_id == profile_id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if interview.status != InterviewStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Interview is already {interview.status.value}",
        )
    interview.status = target
    # Generate the meeting link once, on first acceptance; keep it stable afterwards.
    if target == InterviewStatus.accepted and not interview.meeting_link:
        interview.meeting_link = _make_meeting_link(interview.id)
    db.commit()
    db.refresh(interview)
    return interview


@router.post("/me/interviews/{interview_id}/accept", response_model=InterviewResponse)
def accept_interview(
    interview_id: int,
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    profile = _require_active_profile(db, user.id)
    interview = _transition_interview(db, profile.id, interview_id, InterviewStatus.accepted)
    job = db.query(Job).filter(Job.id == interview.job_id).first()
    company = db.query(Company).filter(Company.id == interview.company_id).first()
    _notify_interview_response(db, interview, company, job, user, accepted=True)
    return InterviewResponse(
        id=interview.id,
        candidate_id=interview.candidate_id,
        company_id=interview.company_id,
        company_name=company.name if company else "",
        job_id=interview.job_id,
        job_title=job.title if job else "",
        interview_date=interview.interview_date,
        status=interview.status.value,
        hire_status=interview.hire_status.value if interview.hire_status else None,
        meeting_link=interview.meeting_link,
        created_at=interview.created_at,
    )


@router.post("/me/interviews/{interview_id}/reject", response_model=InterviewResponse)
def reject_interview(
    interview_id: int,
    user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    profile = _require_active_profile(db, user.id)
    interview = _transition_interview(db, profile.id, interview_id, InterviewStatus.rejected)
    job = db.query(Job).filter(Job.id == interview.job_id).first()
    company = db.query(Company).filter(Company.id == interview.company_id).first()
    _notify_interview_response(db, interview, company, job, user, accepted=False)
    return InterviewResponse(
        id=interview.id,
        candidate_id=interview.candidate_id,
        company_id=interview.company_id,
        company_name=company.name if company else "",
        job_id=interview.job_id,
        job_title=job.title if job else "",
        interview_date=interview.interview_date,
        status=interview.status.value,
        hire_status=interview.hire_status.value if interview.hire_status else None,
        meeting_link=interview.meeting_link,
        created_at=interview.created_at,
    )


def _notify_interview_response(db, interview, company, job, student_user, *, accepted: bool) -> None:
    if not company:
        return
    company_user = db.query(User).filter(User.id == company.user_id).first()
    company_email = company_user.email if company_user else None

    if accepted and interview.meeting_link:
        # Send the meeting link to BOTH parties now that the interview is on.
        email_service.interview_scheduled(
            student_email=student_user.email if student_user else None,
            company_email=company_email,
            company_name=company.name,
            student_name=student_user.email.split("@")[0] if student_user else f"Candidate #{interview.candidate_id}",
            job_title=job.title if job else "",
            interview_date=interview.interview_date,
            meeting_link=interview.meeting_link,
        )
    else:
        # Rejection: just notify the company, no meeting link needed.
        email_service.interview_response(
            company_email=company_email,
            student_id=interview.candidate_id,
            job_title=job.title if job else "",
            accepted=accepted,
        )
