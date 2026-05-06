"""Shared test helpers: registering users, creating approved companies, posting jobs."""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.models import Company, CompanyStatus, User, UserRole
from app.security import hash_password


def unique_email(prefix: str = "u") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def register(client: TestClient, role: str, email: str | None = None, password: str = "Password123!", company_name: str | None = None) -> tuple[str, str]:
    """Register, mark verified (bypassing email click in tests), then log in for tokens.

    Registration now returns 201 + no tokens because email verification is required.
    Tests don't have a way to receive the email, so we flip email_verified directly
    in the DB and then call /auth/login to get the access token.
    """
    email = email or unique_email(role)

    if role == "admin":
        # Public /auth/register rejects role=admin (defence in depth). For tests,
        # seed the admin user directly in the DB.
        db = SessionLocal()
        try:
            user = User(
                email=email,
                password_hash=hash_password(password),
                role=UserRole.admin,
                email_verified=True,
            )
            db.add(user)
            db.commit()
        finally:
            db.close()
    else:
        body = {"email": email, "password": password, "role": role}
        if role == "company":
            body["company_name"] = company_name or "Acme Corp"
        res = client.post("/auth/register", json=body)
        assert res.status_code == 201, res.text

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == email).first()
            assert user is not None, f"user {email} not persisted after register"
            user.email_verified = True
            db.commit()
        finally:
            db.close()

    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return email, login.json()["access_token"]


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
