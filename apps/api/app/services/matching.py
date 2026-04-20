from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import CandidateProfile, Job, Match


def _normalize(items: list[str]) -> set[str]:
    return {i.strip().lower() for i in items if i and i.strip()}


def _score(candidate: CandidateProfile, job: Job) -> dict:
    candidate_skills = _normalize([s.name for s in candidate.skills])
    job_skills = _normalize([s.name for s in job.skills])
    overlap = len(candidate_skills.intersection(job_skills))
    skill_score = (overlap / max(len(job_skills), 1)) * 100

    project_tech = _normalize([tech for p in candidate.projects for tech in (p.technologies or [])])
    project_overlap = len(project_tech.intersection(job_skills))
    project_score = (project_overlap / max(len(job_skills), 1)) * 100

    education_score = 100 if candidate.degree else 50
    experience_score = min(candidate.experience_years / 2.0, 1.0) * 100

    total = (
        skill_score * 0.40
        + project_score * 0.25
        + education_score * 0.20
        + experience_score * 0.15
    )
    return {
        "skill_score": round(skill_score, 2),
        "project_score": round(project_score, 2),
        "education_score": round(education_score, 2),
        "experience_score": round(experience_score, 2),
        "total_score": round(total, 2),
        "explanation": (
            f"Skill Match: {round(skill_score,2)}%, Project Relevance: {round(project_score,2)}%, "
            f"Education Match: {round(education_score,2)}%, Experience Match: {round(experience_score,2)}%"
        ),
    }


def recompute_for_job(db: Session, job_id: int) -> None:
    """Recompute Match rows for a job against every visible, non-disabled candidate.

    Skips jobs that are inactive and candidates whose profile is disabled or
    hidden. Existing Match rows against candidates who later become invisible
    remain in the table as historical records but will not be refreshed here;
    the APIs that read matches filter on candidate visibility/disabled at
    read time.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or not job.is_active:
        return
    candidates = (
        db.query(CandidateProfile)
        .filter(CandidateProfile.visibility_flag.is_(True))
        .filter(CandidateProfile.is_disabled.is_(False))
        .all()
    )
    for candidate in candidates:
        scores = _score(candidate, job)
        row = db.query(Match).filter(Match.candidate_id == candidate.id, Match.job_id == job.id).first()
        if not row:
            row = Match(candidate_id=candidate.id, job_id=job.id, **scores)
            db.add(row)
        else:
            for key, value in scores.items():
                setattr(row, key, value)
    db.commit()
