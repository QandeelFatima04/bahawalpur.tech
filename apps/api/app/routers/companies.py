from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_role
from ..models import (
    AiGenerationLog,
    Application,
    ApplicationStatus,
    CandidateProfile,
    Company,
    CompanyStatus,
    HireStatus,
    InterviewRequest,
    InterviewStatus,
    Job,
    JobLifecycleStatus,
    JobSkill,
    Match,
    Shortlist,
    ShortlistStatus,
    User,
    UserRole,
)


def _apply_lifecycle(job: Job, status: JobLifecycleStatus) -> None:
    """Update both lifecycle_status and the boolean is_active guard together."""
    job.lifecycle_status = status
    job.is_active = status == JobLifecycleStatus.active
from ..schemas import (
    ApplicantRow,
    CandidateMatchResponse,
    CompanyMeResponse,
    ContactRequest,
    HireDecision,
    InterviewCreate,
    InterviewResponse,
    JobCreateRequest,
    JobDraftRequest,
    JobDraftResponse,
    JobResponse,
    JobUpdateRequest,
    ShortlistRequest,
)
from ..services import email as email_service
from ..services.ai import generate_job_description
from ..services.matching import recompute_for_job

router = APIRouter(prefix="/companies", tags=["companies"])


def _company_for_user(db: Session, user_id: int) -> Company:
    company = db.query(Company).filter(Company.user_id == user_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company profile not found")
    if company.is_disabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company is disabled")
    return company


@router.get("/me", response_model=CompanyMeResponse)
def company_me(
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company profile not found")
    return CompanyMeResponse(
        id=company.id,
        name=company.name,
        status=company.status.value,
        is_disabled=company.is_disabled,
        email=user.email,
    )


def _require_approved_company(db: Session, user_id: int) -> Company:
    company = _company_for_user(db, user_id)
    if company.status != CompanyStatus.approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company is not verified")
    return company


def _hires_count(db: Session, job_id: int) -> int:
    return (
        db.query(func.count(InterviewRequest.id))
        .filter(InterviewRequest.job_id == job_id)
        .filter(InterviewRequest.hire_status == HireStatus.yes)
        .scalar()
        or 0
    )


def _job_to_response(db: Session, job: Job) -> JobResponse:
    applicants = db.query(func.count(Application.id)).filter(Application.job_id == job.id).scalar() or 0
    return JobResponse(
        id=job.id,
        company_id=job.company_id,
        title=job.title,
        required_skills=[s.name for s in job.skills],
        experience_level=job.experience_level,
        education_requirement=job.education_requirement,
        location=job.location,
        description=job.description,
        apply_threshold=job.apply_threshold,
        is_active=job.is_active,
        status=job.lifecycle_status.value,
        hiring_limit=job.hiring_limit,
        hires_count=_hires_count(db, job.id),
        applicant_count=applicants,
        extra=job.extra,
    )


# Per-company quota for AI drafts. Generous enough that real authoring won't hit it, tight enough
# to cap cost if a company script-spams the endpoint.
AI_DRAFT_HOURLY_LIMIT = 20
AI_DRAFT_DAILY_LIMIT = 100


@router.post("/jobs", response_model=JobResponse)
def create_job(
    payload: JobCreateRequest,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    company = _require_approved_company(db, user.id)
    job = Job(
        company_id=company.id,
        title=payload.title,
        experience_level=payload.experience_level,
        education_requirement=payload.education_requirement,
        location=payload.location,
        description=payload.description,
        apply_threshold=payload.apply_threshold,
        hiring_limit=payload.hiring_limit,
        extra=payload.extra,
    )
    db.add(job)
    db.flush()
    for skill in sorted({s.strip() for s in payload.required_skills if s.strip()}):
        db.add(JobSkill(job_id=job.id, name=skill))
    db.commit()
    db.refresh(job)
    recompute_for_job(db, job.id)
    return _job_to_response(db, job)


@router.post("/jobs/generate", response_model=JobDraftResponse)
def generate_job_draft(
    payload: JobDraftRequest,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    """Return an AI-drafted job description. Does NOT persist a Job — the company still has to
    POST /companies/jobs to publish. Rate-limited per company via ai_generation_logs."""
    company = _require_approved_company(db, user.id)

    now = datetime.utcnow()
    hourly = (
        db.query(func.count(AiGenerationLog.id))
        .filter(
            AiGenerationLog.company_id == company.id,
            AiGenerationLog.created_at >= now - timedelta(hours=1),
        )
        .scalar()
        or 0
    )
    if hourly >= AI_DRAFT_HOURLY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many drafts in the last hour. Try again later.",
        )
    daily = (
        db.query(func.count(AiGenerationLog.id))
        .filter(
            AiGenerationLog.company_id == company.id,
            AiGenerationLog.created_at >= now - timedelta(days=1),
        )
        .scalar()
        or 0
    )
    if daily >= AI_DRAFT_DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily draft limit reached. Try again tomorrow.",
        )

    result = generate_job_description(payload.role_name, payload.seniority_hint)

    db.add(AiGenerationLog(
        company_id=company.id,
        role_name=payload.role_name[:120],
        success=result["ok"],
        used_fallback=result["used_fallback"],
        tokens_used=result["tokens_used"],
        error=result["error"],
    ))
    db.commit()

    if not result["ok"]:
        if result["error"] == "unrecognized_role":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="We couldn't recognize that role. Try something like 'Software Engineer'.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate a draft for that role.",
        )

    draft = result["draft"]
    return JobDraftResponse(**draft, used_fallback=result["used_fallback"])


@router.get("/jobs", response_model=list[JobResponse])
def list_jobs(
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    company = _company_for_user(db, user.id)
    rows = db.query(Job).filter(Job.company_id == company.id).order_by(desc(Job.created_at)).all()
    return [_job_to_response(db, j) for j in rows]


@router.patch("/jobs/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    payload: JobUpdateRequest,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    company = _company_for_user(db, user.id)
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    skills_changed = False
    if payload.title is not None:
        job.title = payload.title
    if payload.experience_level is not None:
        job.experience_level = payload.experience_level
    if payload.education_requirement is not None:
        job.education_requirement = payload.education_requirement
    if payload.location is not None:
        job.location = payload.location
    if payload.description is not None:
        job.description = payload.description
    if payload.apply_threshold is not None:
        job.apply_threshold = payload.apply_threshold
    if payload.status is not None:
        _apply_lifecycle(job, JobLifecycleStatus(payload.status))
    elif payload.is_active is not None:
        # Legacy path: toggling is_active picks the natural status for each.
        _apply_lifecycle(
            job,
            JobLifecycleStatus.active if payload.is_active else JobLifecycleStatus.inactive,
        )
    if payload.hiring_limit is not None:
        # Pydantic accepts 0 to mean "clear the limit" (unlimited again)
        job.hiring_limit = payload.hiring_limit if payload.hiring_limit > 0 else None
    if payload.required_skills is not None:
        job.skills.clear()
        for skill in sorted({s.strip() for s in payload.required_skills if s.strip()}):
            db.add(JobSkill(job_id=job.id, name=skill))
        skills_changed = True
    if payload.extra is not None:
        job.extra = payload.extra

    db.commit()
    db.refresh(job)
    if skills_changed and job.is_active:
        recompute_for_job(db, job.id)
    return _job_to_response(db, job)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    """Hard-delete a job plus every dependent row (applications, interview requests,
    matches, shortlists, skills). Use close/pause to keep history instead."""
    company = _company_for_user(db, user.id)
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Remove dependents explicitly (no ON DELETE CASCADE on the FKs)
    db.query(InterviewRequest).filter(InterviewRequest.job_id == job.id).delete(synchronize_session=False)
    db.query(Application).filter(Application.job_id == job.id).delete(synchronize_session=False)
    db.query(Shortlist).filter(Shortlist.job_id == job.id).delete(synchronize_session=False)
    db.query(Match).filter(Match.job_id == job.id).delete(synchronize_session=False)
    db.delete(job)
    db.commit()
    return None


@router.get("/jobs/{job_id}/candidates", response_model=list[CandidateMatchResponse])
def list_ranked_candidates(
    job_id: int,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    company = _company_for_user(db, user.id)
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    rows = (
        db.query(Match, CandidateProfile)
        .join(CandidateProfile, CandidateProfile.id == Match.candidate_id)
        .filter(Match.job_id == job.id)
        .filter(CandidateProfile.is_disabled.is_(False))
        .filter(CandidateProfile.visibility_flag.is_(True))
        .order_by(desc(Match.total_score))
        .all()
    )
    return [
        CandidateMatchResponse(
            candidate_id=r.candidate_id,
            skill_score=r.skill_score,
            project_score=r.project_score,
            education_score=r.education_score,
            experience_score=r.experience_score,
            total_score=r.total_score,
            explanation=r.explanation,
        )
        for r, _ in rows
    ]


@router.get("/jobs/{job_id}/applicants", response_model=list[ApplicantRow])
def list_applicants(
    job_id: int,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
    min_score: float | None = None,
    skill: str | None = None,
    education: str | None = None,
    min_experience: float | None = None,
):
    company = _company_for_user(db, user.id)
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    rows = (
        db.query(Application, CandidateProfile)
        .join(CandidateProfile, CandidateProfile.id == Application.candidate_id)
        .filter(Application.job_id == job.id)
        .filter(Application.status == ApplicationStatus.applied)
        .filter(CandidateProfile.is_disabled.is_(False))
        .order_by(desc(Application.match_score_at_apply))
        .all()
    )
    matches = {
        m.candidate_id: m
        for m in db.query(Match).filter(Match.job_id == job.id).all()
    }

    output: list[ApplicantRow] = []
    for application, profile in rows:
        skill_names = [s.name for s in profile.skills]
        if skill and not any(skill.lower() in s.lower() for s in skill_names):
            continue
        if education and (profile.degree or "").lower().find(education.lower()) == -1:
            continue
        if min_experience is not None and profile.experience_years < min_experience:
            continue
        current = matches.get(profile.id)
        current_score = current.total_score if current else application.match_score_at_apply
        if min_score is not None and current_score < min_score:
            continue
        output.append(
            ApplicantRow(
                application_id=application.id,
                candidate_id=profile.id,
                university=profile.university,
                degree=profile.degree,
                graduation_year=profile.graduation_year,
                experience_years=profile.experience_years,
                skills=skill_names,
                linkedin_url=profile.linkedin_url,
                github_url=profile.github_url,
                leetcode_url=profile.leetcode_url,
                hackerrank_url=profile.hackerrank_url,
                status=application.status.value,
                match_score_at_apply=application.match_score_at_apply,
                current_total_score=current_score,
                applied_at=application.created_at,
            )
        )
    return output


@router.post("/shortlists")
def shortlist_candidate(
    payload: ShortlistRequest,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    company = _company_for_user(db, user.id)
    row = (
        db.query(Shortlist)
        .filter(Shortlist.company_id == company.id, Shortlist.candidate_id == payload.candidate_id, Shortlist.job_id == payload.job_id)
        .first()
    )
    if not row:
        row = Shortlist(
            company_id=company.id,
            candidate_id=payload.candidate_id,
            job_id=payload.job_id,
            status=ShortlistStatus(payload.status),
        )
        db.add(row)
    else:
        row.status = ShortlistStatus(payload.status)
    db.commit()
    return {"id": row.id, "status": row.status.value}


@router.post("/contact")
def contact_candidate(
    payload: ContactRequest,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    company = _company_for_user(db, user.id)
    return {
        "message": "Contact event recorded",
        "company_id": company.id,
        "candidate_id": payload.candidate_id,
        "job_id": payload.job_id,
    }


def _interview_to_response(db: Session, interview: InterviewRequest) -> InterviewResponse:
    job = db.query(Job).filter(Job.id == interview.job_id).first()
    company = db.query(Company).filter(Company.id == interview.company_id).first()
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


@router.post("/interviews", response_model=InterviewResponse)
def send_interview_request(
    payload: InterviewCreate,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    company = _require_approved_company(db, user.id)
    job = db.query(Job).filter(Job.id == payload.job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    candidate = db.query(CandidateProfile).filter(CandidateProfile.id == payload.candidate_id).first()
    if not candidate or candidate.is_disabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not available")
    interview_dt = payload.interview_date
    if interview_dt.tzinfo is not None:
        interview_dt = interview_dt.astimezone(timezone.utc).replace(tzinfo=None)
    if interview_dt < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview date must be in the future")

    existing = (
        db.query(InterviewRequest)
        .filter(
            InterviewRequest.company_id == company.id,
            InterviewRequest.candidate_id == candidate.id,
            InterviewRequest.job_id == job.id,
        )
        .first()
    )
    if existing and existing.status in (InterviewStatus.pending, InterviewStatus.accepted):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An interview is already {existing.status.value} for this candidate/job",
        )
    if existing:
        existing.status = InterviewStatus.pending
        existing.interview_date = interview_dt
        existing.hire_status = None
        db.commit()
        db.refresh(existing)
        interview = existing
    else:
        interview = InterviewRequest(
            company_id=company.id,
            candidate_id=candidate.id,
            job_id=job.id,
            interview_date=interview_dt,
            status=InterviewStatus.pending,
        )
        db.add(interview)
        db.commit()
        db.refresh(interview)

    student_user = (
        db.query(User)
        .join(CandidateProfile, CandidateProfile.user_id == User.id)
        .filter(CandidateProfile.id == candidate.id)
        .first()
    )
    email_service.interview_requested(
        student_email=student_user.email if student_user else None,
        company_name=company.name,
        job_title=job.title,
        interview_date=interview_dt,
    )

    return _interview_to_response(db, interview)


@router.post("/interviews/{interview_id}/reschedule", response_model=InterviewResponse)
def reschedule_interview(
    interview_id: int,
    payload: InterviewCreate,  # reuses {candidate_id, job_id, interview_date}; only interview_date is required to change
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    """Move a pending/accepted interview to a new date. If the student had
    already accepted, reset the status to pending so they explicitly re-confirm
    the new time."""
    company = _company_for_user(db, user.id)
    interview = (
        db.query(InterviewRequest)
        .filter(InterviewRequest.id == interview_id, InterviewRequest.company_id == company.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if interview.status in (InterviewStatus.completed, InterviewStatus.cancelled, InterviewStatus.rejected):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reschedule a {interview.status.value} interview",
        )

    new_dt = payload.interview_date
    if new_dt.tzinfo is not None:
        new_dt = new_dt.astimezone(timezone.utc).replace(tzinfo=None)
    if new_dt < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview date must be in the future",
        )

    interview.interview_date = new_dt
    # Reset to pending so the student explicitly re-confirms the new time.
    # Keep the meeting_link (Jitsi room is stable) so the same URL still works.
    interview.status = InterviewStatus.pending
    db.commit()
    db.refresh(interview)

    # Notify the student about the new time.
    student_user = (
        db.query(User)
        .join(CandidateProfile, CandidateProfile.user_id == User.id)
        .filter(CandidateProfile.id == interview.candidate_id)
        .first()
    )
    job = db.query(Job).filter(Job.id == interview.job_id).first()
    email_service.interview_requested(
        student_email=student_user.email if student_user else None,
        company_name=company.name,
        job_title=job.title if job else "",
        interview_date=new_dt,
    )

    return _interview_to_response(db, interview)


@router.get("/interviews", response_model=list[InterviewResponse])
def list_interviews(
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
    status_filter: str | None = None,
):
    company = _company_for_user(db, user.id)
    q = db.query(InterviewRequest).filter(InterviewRequest.company_id == company.id)
    if status_filter:
        try:
            q = q.filter(InterviewRequest.status == InterviewStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")
    rows = q.order_by(desc(InterviewRequest.interview_date)).all()
    return [_interview_to_response(db, i) for i in rows]


@router.post("/interviews/{interview_id}/hire", response_model=InterviewResponse)
def mark_hire(
    interview_id: int,
    payload: HireDecision,
    user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    company = _company_for_user(db, user.id)
    interview = (
        db.query(InterviewRequest)
        .filter(InterviewRequest.id == interview_id, InterviewRequest.company_id == company.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if interview.status != InterviewStatus.accepted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hire decision is only available for accepted interviews",
        )
    if datetime.utcnow() < interview.interview_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hire decision cannot be recorded before the interview date",
        )
    interview.hire_status = HireStatus.yes if payload.hired else HireStatus.no
    interview.status = InterviewStatus.completed
    db.commit()
    db.refresh(interview)

    job = db.query(Job).filter(Job.id == interview.job_id).first()

    # Auto-close the job when the hiring limit is reached
    if payload.hired and job and job.hiring_limit is not None and _hires_count(db, job.id) >= job.hiring_limit:
        _apply_lifecycle(job, JobLifecycleStatus.inactive)
        db.commit()

    # Notify the student of the hire outcome.
    student_user = (
        db.query(User)
        .join(CandidateProfile, CandidateProfile.user_id == User.id)
        .filter(CandidateProfile.id == interview.candidate_id)
        .first()
    )
    email_service.hire_decision(
        student_email=student_user.email if student_user else None,
        company_name=company.name,
        job_title=job.title if job else "",
        hired=payload.hired,
    )

    return _interview_to_response(db, interview)
