from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_role
from ..models import Match, User, UserRole
from ..schemas import CandidateMatchResponse

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/jobs/{job_id}", response_model=list[CandidateMatchResponse])
def get_job_matches(
    job_id: int,
    user: User = Depends(require_role(UserRole.company, UserRole.admin)),
    db: Session = Depends(get_db),
):
    rows = db.query(Match).filter(Match.job_id == job_id).order_by(desc(Match.total_score)).all()
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
        for r in rows
    ]
