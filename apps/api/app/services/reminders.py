"""Scheduled-reminder dispatcher for accepted interviews.

Called by an HTTP endpoint that an external cron hits every few minutes. Two stages:
  stage 1: 24h-before reminder
  stage 2: 1h-before reminder

The cron job's interval doesn't matter — each interview can only advance one stage at a
time, and we only fire when `now` is within the threshold *and* before the interview.
That means even if cron lags by 30 minutes the reminders still go out late but only once.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..models import (
    CandidateProfile,
    Company,
    InterviewRequest,
    InterviewStatus,
    Job,
    User,
)
from . import email as email_service

logger = logging.getLogger("careerbridge.reminders")

H24 = timedelta(hours=24)
H1 = timedelta(hours=1)


def _student_label(user: User | None, profile: CandidateProfile | None) -> str:
    if user and user.email:
        # "alice@example.com" → "alice"
        return user.email.split("@")[0]
    if profile:
        return f"Candidate #{profile.id}"
    return "Candidate"


def _send_one(db: Session, interview: InterviewRequest, horizon_label: str) -> bool:
    """Send the reminder for one interview. Returns True on success (so the caller
    can advance reminder_stage). Never raises — email failures are logged."""
    job = db.query(Job).filter(Job.id == interview.job_id).first()
    company = db.query(Company).filter(Company.id == interview.company_id).first()
    candidate = (
        db.query(CandidateProfile).filter(CandidateProfile.id == interview.candidate_id).first()
    )
    student_user = (
        db.query(User).filter(User.id == candidate.user_id).first() if candidate else None
    )
    company_user = (
        db.query(User).filter(User.id == company.user_id).first() if company else None
    )

    if not (job and company and candidate and student_user and interview.meeting_link):
        logger.warning("reminder-skip interview_id=%s reason=missing_relations", interview.id)
        return False

    try:
        email_service.interview_reminder(
            student_email=student_user.email,
            company_email=company_user.email if company_user else None,
            student_name=_student_label(student_user, candidate),
            company_name=company.name,
            job_title=job.title,
            interview_date=interview.interview_date,
            meeting_link=interview.meeting_link,
            horizon=horizon_label,
        )
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "reminder-send-failed interview_id=%s horizon=%s exc=%s",
            interview.id, horizon_label, exc,
        )
        return False


def send_due_reminders(db: Session) -> dict:
    """Fire every reminder whose window has opened. Idempotent: an interview can only
    advance one stage per run, and stages 1+2 are mutually exclusive (a 1h reminder
    won't be sent if the interview is already past).

    Returns a small summary dict suitable for logging / the cron response.
    """
    now = datetime.utcnow()

    # Stage 1: 24h reminders. Window is [now, now + 24h] AND interview is still > 1h out
    # (otherwise the 1h reminder will catch it instead).
    stage1 = (
        db.query(InterviewRequest)
        .filter(
            InterviewRequest.status == InterviewStatus.accepted,
            InterviewRequest.meeting_link.isnot(None),
            InterviewRequest.reminder_stage < 1,
            InterviewRequest.interview_date > now + H1,
            InterviewRequest.interview_date <= now + H24,
        )
        .all()
    )

    # Stage 2: 1h reminders. interview is in (now, now + 1h].
    stage2 = (
        db.query(InterviewRequest)
        .filter(
            InterviewRequest.status == InterviewStatus.accepted,
            InterviewRequest.meeting_link.isnot(None),
            InterviewRequest.reminder_stage < 2,
            InterviewRequest.interview_date > now,
            InterviewRequest.interview_date <= now + H1,
        )
        .all()
    )

    sent_24h = 0
    for interview in stage1:
        if _send_one(db, interview, horizon_label="24 hours"):
            interview.reminder_stage = 1
            sent_24h += 1
    if sent_24h:
        db.commit()

    sent_1h = 0
    for interview in stage2:
        if _send_one(db, interview, horizon_label="1 hour"):
            interview.reminder_stage = 2
            sent_1h += 1
    if sent_1h:
        db.commit()

    summary = {"now": now.isoformat(), "sent_24h": sent_24h, "sent_1h": sent_1h}
    logger.info("reminders run %s", summary)
    return summary
