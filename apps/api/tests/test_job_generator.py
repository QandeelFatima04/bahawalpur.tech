"""Tests for the AI job-description generator endpoint.

Runs entirely against the deterministic fallback (OPENAI_API_KEY is unset in conftest), so the
suite stays offline and predictable.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import AiGenerationLog, Company
from app.routers import companies as companies_router
from tests.helpers import approve_all_companies, auth, register


def _generate(client: TestClient, token: str, role: str = "Software Engineer", **extra):
    return client.post(
        "/companies/jobs/generate",
        json={"role_name": role, **extra},
        headers=auth(token),
    )


def test_generate_requires_company_role():
    client = TestClient(app)
    _, student_token = register(client, "student")
    res = _generate(client, student_token)
    assert res.status_code == 403


def test_generate_requires_approved_company():
    """A pending (unapproved) company cannot use the AI generator."""
    client = TestClient(app)
    _, company_token = register(client, "company")
    # Skip approve_all_companies — leave status pending.
    res = _generate(client, company_token)
    assert res.status_code == 403


def test_generate_returns_full_draft_via_fallback():
    """With no OPENAI_API_KEY, the deterministic fallback fills every required field."""
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    res = _generate(client, company_token, role="Software Engineer")
    assert res.status_code == 200, res.text
    body = res.json()
    # All required fields present and well-typed
    assert body["title"]
    assert body["job_summary"]
    assert isinstance(body["key_responsibilities"], list) and body["key_responsibilities"]
    assert isinstance(body["required_skills"], list) and body["required_skills"]
    assert isinstance(body["preferred_skills"], list)
    assert body["experience_level"] in {"entry", "mid", "senior", "lead"}
    assert body["employment_type"] in {"full_time", "part_time", "contract", "internship"}
    assert body["work_mode"] in {"onsite", "remote", "hybrid"}
    assert isinstance(body["benefits"], list) and body["benefits"]
    assert isinstance(body["interview_process"], list) and body["interview_process"]
    assert isinstance(body["tags"], list) and body["tags"]
    assert body["used_fallback"] is True


def test_generate_short_role_rejected_by_validation():
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    res = _generate(client, company_token, role="x")
    assert res.status_code == 422  # min_length=2


def test_generate_picks_template_keyed_off_role():
    """Different role keywords should drive different fallback templates."""
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    sw = _generate(client, company_token, role="Software Engineer").json()
    design = _generate(client, company_token, role="UI/UX Designer").json()
    assert sw["department"] == "Engineering"
    assert design["department"] == "Design"
    assert "Figma" in design["required_skills"]


def test_generate_writes_audit_log():
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _generate(client, company_token, role="Data Analyst")
    db = SessionLocal()
    try:
        log = db.query(AiGenerationLog).order_by(AiGenerationLog.id.desc()).first()
        assert log is not None
        assert log.role_name == "Data Analyst"
        assert log.success is True
        assert log.used_fallback is True
    finally:
        db.close()


def test_generate_rate_limit_per_company(monkeypatch):
    """After the hourly cap, the endpoint returns 429."""
    monkeypatch.setattr(companies_router, "AI_DRAFT_HOURLY_LIMIT", 2)
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()

    assert _generate(client, company_token).status_code == 200
    assert _generate(client, company_token).status_code == 200
    third = _generate(client, company_token)
    assert third.status_code == 429
    assert "hour" in third.json()["detail"].lower()


def test_create_job_round_trips_extra_field():
    """The new `extra` JSON field on Job persists through create + read."""
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    payload = {
        "title": "Backend Engineer",
        "required_skills": ["Python", "FastAPI"],
        "experience_level": "entry",
        "education_requirement": "BSCS",
        "location": "Lahore",
        "description": "Build APIs.",
        "extra": {
            "employment_type": "full_time",
            "work_mode": "hybrid",
            "tags": ["python", "backend"],
        },
    }
    res = client.post("/companies/jobs", json=payload, headers=auth(company_token))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["extra"]["work_mode"] == "hybrid"
    assert body["extra"]["tags"] == ["python", "backend"]

    # And it shows up on subsequent list reads
    listed = client.get("/companies/jobs", headers=auth(company_token)).json()
    assert any(j["extra"] and j["extra"].get("work_mode") == "hybrid" for j in listed)


def _set_company_disabled(disabled: bool) -> None:
    db = SessionLocal()
    try:
        for c in db.query(Company).all():
            c.is_disabled = disabled
        db.commit()
    finally:
        db.close()


def test_generate_blocked_when_company_disabled():
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _set_company_disabled(True)
    try:
        res = _generate(client, company_token)
        assert res.status_code == 403
    finally:
        _set_company_disabled(False)
