from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import SessionLocal, get_db
from ..deps import require_role
from ..models import (
    CandidateProfile,
    CandidateProject,
    CandidateSkill,
    CareerReport,
    CoachConversation,
    CoachMessage,
    User,
    UserRole,
)
from ..services.coach import build_system_prompt, stream_reply, synthesize_speech, transcribe_audio
from ..services.turnstile import verify_turnstile

router = APIRouter(prefix="/students", tags=["coach"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ConversationOut(BaseModel):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class CreateConversationRequest(BaseModel):
    turnstile_token: str | None = None


class ChatRequest(BaseModel):
    message: str


class TtsRequest(BaseModel):
    text: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_profile(db: Session, user: User) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Please complete your profile before using the coach.",
        )
    return profile


def _build_prompt(db: Session, user: User) -> str:
    profile = _get_profile(db, user)
    skills = [s.name for s in db.query(CandidateSkill).filter(CandidateSkill.profile_id == profile.id).all()]
    projects = [
        {"title": p.title, "technologies": p.technologies or []}
        for p in db.query(CandidateProject).filter(CandidateProject.profile_id == profile.id).all()
    ]
    report = db.query(CareerReport).filter(CareerReport.candidate_id == profile.id).first()

    first_name = (user.email.split("@")[0] or "Student").split(".")[0].capitalize()

    return build_system_prompt(
        name=first_name,
        university=profile.university,
        degree=profile.degree,
        graduation_year=profile.graduation_year,
        experience_years=profile.experience_years,
        location=profile.current_location,
        skills=skills,
        projects=projects,
        professional_summary=report.professional_summary if report else "",
        suggested_paths=list(report.suggested_paths) if report else [],
        skill_gaps=list(report.skill_gaps) if report else [],
        resume_suggestions=list(report.resume_suggestions) if report else [],
    )


def _get_conversation(db: Session, conv_id: int, user: User) -> CoachConversation:
    conv = db.query(CoachConversation).filter(CoachConversation.id == conv_id).first()
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/me/coach/conversations", response_model=ConversationOut, status_code=201)
def create_conversation(
    payload: CreateConversationRequest | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.student)),
):
    verify_turnstile(payload.turnstile_token if payload else None)
    conv = CoachConversation(user_id=user.id, created_at=datetime.utcnow())
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("/me/coach/conversations", response_model=list[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.student)),
):
    return (
        db.query(CoachConversation)
        .filter(CoachConversation.user_id == user.id)
        .order_by(CoachConversation.id.desc())
        .all()
    )


@router.get("/me/coach/conversations/{conv_id}/messages", response_model=list[MessageOut])
def get_messages(
    conv_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.student)),
):
    conv = _get_conversation(db, conv_id, user)
    return conv.messages


@router.post("/me/coach/conversations/{conv_id}/chat")
def chat(
    conv_id: int,
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.student)),
):
    _get_conversation(db, conv_id, user)

    # Save user message immediately so history is complete before streaming starts
    db.add(CoachMessage(
        conversation_id=conv_id,
        role="user",
        content=body.message,
        created_at=datetime.utcnow(),
    ))
    db.commit()

    # Build history from DB (all prior messages + the one we just saved)
    history = [
        {"role": m.role, "content": m.content}
        for m in db.query(CoachMessage)
        .filter(CoachMessage.conversation_id == conv_id)
        .order_by(CoachMessage.id)
        .all()
    ]

    system_prompt = _build_prompt(db, user)

    def event_stream():
        full_reply: list[str] = []
        try:
            for chunk in stream_reply(history, system_prompt):
                full_reply.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        finally:
            # Persist assistant reply using a fresh session so the generator
            # closure doesn't fight the request-scoped session lifetime.
            if full_reply:
                with SessionLocal() as fresh_db:
                    fresh_db.add(CoachMessage(
                        conversation_id=conv_id,
                        role="assistant",
                        content="".join(full_reply),
                        created_at=datetime.utcnow(),
                    ))
                    fresh_db.commit()
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/me/coach/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    user: User = Depends(require_role(UserRole.student)),
):
    file_bytes = await audio.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio file")

    text = transcribe_audio(file_bytes, audio.filename or "audio.webm", audio.content_type or "audio/webm")
    return {"text": text.strip()}


@router.post("/me/coach/tts")
def tts(
    body: TtsRequest,
    user: User = Depends(require_role(UserRole.student)),
):
    if not body.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty text")

    mp3_bytes = synthesize_speech(body.text)
    return Response(content=mp3_bytes, media_type="audio/mpeg")
