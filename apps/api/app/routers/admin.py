from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_role
from ..models import (
    Application,
    ApplicationStatus,
    AuditLog,
    CandidateProfile,
    Company,
    CompanyStatus,
    InterviewRequest,
    InterviewStatus,
    Job,
    JobLifecycleStatus,
    Match,
    User,
    UserRole,
)
from ..schemas import (
    AdminCompanyRow,
    AdminCompanyUpdate,
    AdminJobRow,
    AdminJobUpdate,
    AdminStudentRow,
    AdminStudentUpdate,
    AnalyticsResponse,
    CompanyDecisionRequest,
    InterviewResponse,
    InterviewUpdate,
)
from ..services import email as email_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/companies/pending")
def pending_companies(
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Company, User)
        .join(User, User.id == Company.user_id)
        .filter(Company.status == CompanyStatus.pending)
        .all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "user_id": c.user_id,
            "email": u.email,
            "status": c.status.value,
            "created_at": c.created_at.isoformat(),
        }
        for c, u in rows
    ]


@router.post("/companies/{company_id}/{decision}")
def decision_in_path(
    company_id: int,
    decision: str,
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    payload = CompanyDecisionRequest(decision=decision)
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    company.status = CompanyStatus.approved if payload.decision == "approve" else CompanyStatus.rejected
    db.add(AuditLog(actor_user_id=user.id, action="company_reviewed", payload={"company_id": company_id, "decision": payload.decision}))
    db.commit()

    if payload.decision == "approve":
        owner = db.query(User).filter(User.id == company.user_id).first()
        email_service.company_approved(
            company_email=owner.email if owner else None,
            company_name=company.name,
        )

    return {"id": company.id, "status": company.status.value}


@router.get("/students", response_model=list[AdminStudentRow])
def list_students(
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
    q: str | None = None,
    disabled: bool | None = None,
    limit: int = 50,
    offset: int = 0,
):
    query = (
        db.query(CandidateProfile, User)
        .join(User, User.id == CandidateProfile.user_id)
    )
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                User.email.ilike(like),
                CandidateProfile.university.ilike(like),
                CandidateProfile.degree.ilike(like),
            )
        )
    if disabled is not None:
        query = query.filter(CandidateProfile.is_disabled.is_(disabled))
    rows = query.order_by(desc(CandidateProfile.created_at)).limit(limit).offset(offset).all()
    return [
        AdminStudentRow(
            id=profile.id,
            user_id=u.id,
            email=u.email,
            university=profile.university,
            degree=profile.degree,
            graduation_year=profile.graduation_year,
            experience_years=profile.experience_years,
            visibility_flag=profile.visibility_flag,
            is_disabled=profile.is_disabled,
        )
        for profile, u in rows
    ]


@router.patch("/students/{student_id}", response_model=AdminStudentRow)
def update_student(
    student_id: int,
    payload: AdminStudentUpdate,
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    changes: dict = {}
    if payload.is_disabled is not None:
        profile.is_disabled = payload.is_disabled
        changes["is_disabled"] = payload.is_disabled
    if payload.visibility_flag is not None:
        profile.visibility_flag = payload.visibility_flag
        changes["visibility_flag"] = payload.visibility_flag
    if payload.university is not None:
        profile.university = payload.university
    if payload.degree is not None:
        profile.degree = payload.degree
    if payload.graduation_year is not None:
        profile.graduation_year = payload.graduation_year
    if payload.experience_years is not None:
        profile.experience_years = payload.experience_years
    if profile.is_disabled:
        db.query(Match).filter(Match.candidate_id == profile.id).delete()
    db.add(AuditLog(actor_user_id=user.id, action="admin_student_update", payload={"student_id": student_id, "changes": changes}))
    db.commit()
    db.refresh(profile)
    u = db.query(User).filter(User.id == profile.user_id).first()
    return AdminStudentRow(
        id=profile.id,
        user_id=u.id,
        email=u.email,
        university=profile.university,
        degree=profile.degree,
        graduation_year=profile.graduation_year,
        experience_years=profile.experience_years,
        visibility_flag=profile.visibility_flag,
        is_disabled=profile.is_disabled,
    )


@router.get("/companies", response_model=list[AdminCompanyRow])
def list_companies(
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
    q: str | None = None,
    status_filter: str | None = None,
    disabled: bool | None = None,
    limit: int = 50,
    offset: int = 0,
):
    query = db.query(Company, User).join(User, User.id == Company.user_id)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Company.name.ilike(like), User.email.ilike(like)))
    if status_filter:
        try:
            query = query.filter(Company.status == CompanyStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")
    if disabled is not None:
        query = query.filter(Company.is_disabled.is_(disabled))
    rows = query.order_by(desc(Company.created_at)).limit(limit).offset(offset).all()
    return [
        AdminCompanyRow(
            id=c.id,
            user_id=u.id,
            email=u.email,
            name=c.name,
            status=c.status.value,
            is_disabled=c.is_disabled,
        )
        for c, u in rows
    ]


@router.patch("/companies/{company_id}", response_model=AdminCompanyRow)
def update_company(
    company_id: int,
    payload: AdminCompanyUpdate,
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    changes: dict = {}
    if payload.name is not None:
        company.name = payload.name
    if payload.status is not None:
        company.status = CompanyStatus(payload.status)
        changes["status"] = payload.status
    if payload.is_disabled is not None:
        company.is_disabled = payload.is_disabled
        changes["is_disabled"] = payload.is_disabled
        if payload.is_disabled:
            db.query(Job).filter(Job.company_id == company.id).update(
                {
                    Job.is_active: False,
                    Job.lifecycle_status: JobLifecycleStatus.inactive,
                }
            )
    db.add(AuditLog(actor_user_id=user.id, action="admin_company_update", payload={"company_id": company_id, "changes": changes}))
    db.commit()
    db.refresh(company)
    u = db.query(User).filter(User.id == company.user_id).first()
    return AdminCompanyRow(
        id=company.id,
        user_id=u.id,
        email=u.email,
        name=company.name,
        status=company.status.value,
        is_disabled=company.is_disabled,
    )


@router.get("/jobs", response_model=list[AdminJobRow])
def list_jobs(
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
    q: str | None = None,
    active: bool | None = None,
    limit: int = 50,
    offset: int = 0,
):
    query = db.query(Job, Company).join(Company, Company.id == Job.company_id)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Job.title.ilike(like), Company.name.ilike(like), Job.location.ilike(like)))
    if active is not None:
        query = query.filter(Job.is_active.is_(active))
    rows = query.order_by(desc(Job.created_at)).limit(limit).offset(offset).all()
    result: list[AdminJobRow] = []
    for job, company in rows:
        count = db.query(func.count(Application.id)).filter(Application.job_id == job.id).scalar() or 0
        result.append(
            AdminJobRow(
                id=job.id,
                company_id=company.id,
                company_name=company.name,
                title=job.title,
                location=job.location,
                apply_threshold=job.apply_threshold,
                is_active=job.is_active,
                status=job.lifecycle_status.value,
                applicant_count=count,
            )
        )
    return result


@router.patch("/jobs/{job_id}", response_model=AdminJobRow)
def update_job(
    job_id: int,
    payload: AdminJobUpdate,
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    changes: dict = {}
    if payload.status is not None:
        new_status = JobLifecycleStatus(payload.status)
        job.lifecycle_status = new_status
        job.is_active = new_status == JobLifecycleStatus.active
        changes["status"] = payload.status
    elif payload.is_active is not None:
        job.is_active = payload.is_active
        job.lifecycle_status = JobLifecycleStatus.active if payload.is_active else JobLifecycleStatus.inactive
        changes["is_active"] = payload.is_active
    if payload.title is not None:
        job.title = payload.title
    if payload.location is not None:
        job.location = payload.location
    if payload.apply_threshold is not None:
        job.apply_threshold = payload.apply_threshold
    db.add(AuditLog(actor_user_id=user.id, action="admin_job_update", payload={"job_id": job_id, "changes": changes}))
    db.commit()
    db.refresh(job)
    company = db.query(Company).filter(Company.id == job.company_id).first()
    count = db.query(func.count(Application.id)).filter(Application.job_id == job.id).scalar() or 0
    return AdminJobRow(
        id=job.id,
        company_id=company.id,
        company_name=company.name,
        title=job.title,
        location=job.location,
        apply_threshold=job.apply_threshold,
        is_active=job.is_active,
        status=job.lifecycle_status.value,
        applicant_count=count,
    )


@router.get("/interviews", response_model=list[InterviewResponse])
def list_interviews(
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
    status_filter: str | None = None,
    q: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    query = (
        db.query(InterviewRequest, Job, Company)
        .join(Job, Job.id == InterviewRequest.job_id)
        .join(Company, Company.id == InterviewRequest.company_id)
    )
    if status_filter:
        try:
            query = query.filter(InterviewRequest.status == InterviewStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Company.name.ilike(like), Job.title.ilike(like)))
    rows = query.order_by(desc(InterviewRequest.interview_date)).limit(limit).offset(offset).all()
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


@router.patch("/interviews/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: int,
    payload: InterviewUpdate,
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    interview = db.query(InterviewRequest).filter(InterviewRequest.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if payload.status is not None:
        interview.status = InterviewStatus(payload.status)
    if payload.interview_date is not None:
        interview.interview_date = payload.interview_date
    db.add(AuditLog(actor_user_id=user.id, action="admin_interview_update", payload={"interview_id": interview_id}))
    db.commit()
    db.refresh(interview)
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


@router.get("/analytics", response_model=AnalyticsResponse)
def analytics(
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    students_total = db.query(func.count(CandidateProfile.id)).filter(CandidateProfile.is_disabled.is_(False)).scalar() or 0
    companies_verified = (
        db.query(func.count(Company.id))
        .filter(Company.status == CompanyStatus.approved)
        .filter(Company.is_disabled.is_(False))
        .scalar()
        or 0
    )
    jobs_active = db.query(func.count(Job.id)).filter(Job.is_active.is_(True)).scalar() or 0
    interviews_active = (
        db.query(func.count(InterviewRequest.id))
        .filter(InterviewRequest.status.in_([InterviewStatus.pending, InterviewStatus.accepted]))
        .scalar()
        or 0
    )
    pending_companies = (
        db.query(func.count(Company.id)).filter(Company.status == CompanyStatus.pending).scalar() or 0
    )
    matches_total = db.query(func.count(Match.id)).scalar() or 0
    return AnalyticsResponse(
        students_total=students_total,
        companies_verified=companies_verified,
        jobs_active=jobs_active,
        interviews_active=interviews_active,
        pending_companies=pending_companies,
        matches_total=matches_total,
    )


@router.get("/ai-audit")
def ai_audit(
    user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [{"action": r.action, "payload": r.payload, "created_at": r.created_at.isoformat()} for r in rows]
