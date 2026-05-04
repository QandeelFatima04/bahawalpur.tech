"""Shared test helpers: registering users, creating approved companies, posting jobs."""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.models import Company, CompanyStatus


def unique_email(prefix: str = "u") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def register(client: TestClient, role: str, email: str | None = None, password: str = "Password123!", company_name: str | None = None) -> tuple[str, str]:
    email = email or unique_email(role)
    body = {"email": email, "password": password, "role": role}
    if role == "company":
        body["company_name"] = company_name or "Acme Corp"
    res = client.post("/auth/register", json=body)
    assert res.status_code == 200, res.text
    tokens = res.json()
    return email, tokens["access_token"]


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
