"""Shared test helpers: registering users, creating approved companies, posting jobs."""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.models import CandidateProfile, Company, CompanyStatus, User, UserRole


def unique_email(prefix: str = "u") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def _mark_email_verified(email: str) -> None:
    """Bypass the email-verification gate so tests can log in immediately after register."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.email_verified = True
            user.email_verification_token = None
            user.email_verification_sent_at = None
            db.commit()
    finally:
        db.close()


def register(
    client: TestClient,
    role: str,
    email: str | None = None,
    password: str = "Password123!",
    company_name: str | None = None,
) -> tuple[str, str]:
    """Register a user, mark their email verified, and return (email, access_token).

    Admin self-registration is rejected by the public endpoint, so admins are created
    directly via the DB. Companies and students go through the normal /auth/register
    flow, but we skip the email-click step in tests.
    """
    email = email or unique_email(role)
    if role == "admin":
        _create_admin(email, password)
        login = client.post("/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200, login.text
        return email, login.json()["access_token"]

    body = {"email": email, "password": password, "role": role}
    if role == "company":
        body["company_name"] = company_name or "Acme Corp"
    res = client.post("/auth/register", json=body)
    assert res.status_code == 201, res.text
    _mark_email_verified(email)
    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return email, login.json()["access_token"]


def _create_admin(email: str, password: str) -> None:
    """Admins cannot self-register through /auth/register, so we seed them directly."""
    from app.security import hash_password

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            return
        admin = User(
            email=email,
            password_hash=hash_password(password),
            role=UserRole.admin,
            email_verified=True,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()


def set_student_disabled(email: str, disabled: bool) -> None:
    """Flip the CandidateProfile.is_disabled flag for the student with this email.

    Creates a profile row if one doesn't exist yet (mirrors what real /students endpoints
    do via _profile_or_create).
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
        if not profile:
            profile = CandidateProfile(user_id=user.id)
            db.add(profile)
            db.flush()
        profile.is_disabled = disabled
        db.commit()
    finally:
        db.close()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def approve_all_companies() -> None:
    """Bypass the admin approval flow by directly flipping company status in the DB."""
    db = SessionLocal()
    try:
        for company in db.query(Company).all():
            company.status = CompanyStatus.approved
        db.commit()
    finally:
        db.close()
