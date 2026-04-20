from fastapi.testclient import TestClient

from app.main import app
from tests.helpers import approve_all_companies, auth, register


def _post_job(client: TestClient, company_token: str, apply_threshold: float, skills=None) -> int:
    body = {
        "title": "Backend Engineer",
        "required_skills": skills or ["Python", "FastAPI", "PostgreSQL"],
        "experience_level": "entry",
        "education_requirement": "BSCS",
        "location": "Remote",
        "description": "Build things.",
        "apply_threshold": apply_threshold,
    }
    res = client.post("/companies/jobs", json=body, headers=auth(company_token))
    assert res.status_code == 200, res.text
    return res.json()["id"]


def _set_profile(client: TestClient, student_token: str, skills: list[str]):
    res = client.put(
        "/students/me/profile",
        json={
            "university": "IUB",
            "degree": "BSCS",
            "graduation_year": 2024,
            "experience_years": 1.0,
            "summary": "test",
            "skills": skills,
            "projects": [{"title": "p1", "technologies": skills, "description": "x"}],
        },
        headers=auth(student_token),
    )
    assert res.status_code == 200
    # Enable visibility so matching + apply permit them
    client.patch("/students/me/visibility", json={"visibility_flag": True}, headers=auth(student_token))


def test_apply_blocked_below_threshold():
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _, student_token = register(client, "student")

    job_id = _post_job(client, company_token, apply_threshold=60.0)
    # Give the student only 1 of 3 required skills -> skill score ~33%, total well below 60%
    _set_profile(client, student_token, skills=["Python"])

    res = client.post(
        "/students/me/applications",
        json={"job_id": job_id},
        headers=auth(student_token),
    )
    assert res.status_code == 403
    detail = res.json()["detail"]
    # The error payload should carry both numbers so the UI can explain
    assert detail["error"] == "below_threshold"
    assert detail["apply_threshold"] == 60.0
    assert detail["total_score"] < 60.0


def test_apply_allowed_when_threshold_is_zero():
    """A company can set apply_threshold=0 to allow everyone."""
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _, student_token = register(client, "student")

    job_id = _post_job(client, company_token, apply_threshold=0.0)
    _set_profile(client, student_token, skills=["Python"])

    res = client.post(
        "/students/me/applications",
        json={"job_id": job_id},
        headers=auth(student_token),
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "applied"


def test_apply_blocked_when_threshold_is_one_hundred():
    """apply_threshold=100 effectively locks everyone out."""
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _, student_token = register(client, "student")

    job_id = _post_job(client, company_token, apply_threshold=100.0)
    _set_profile(client, student_token, skills=["Python", "FastAPI", "PostgreSQL"])

    res = client.post(
        "/students/me/applications",
        json={"job_id": job_id},
        headers=auth(student_token),
    )
    assert res.status_code == 403


def test_apply_allowed_at_or_above_threshold():
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _, student_token = register(client, "student")

    job_id = _post_job(client, company_token, apply_threshold=60.0, skills=["Python", "FastAPI"])
    # All skills matched -> skill score 100, total should comfortably exceed 60
    _set_profile(client, student_token, skills=["Python", "FastAPI"])

    res = client.post(
        "/students/me/applications",
        json={"job_id": job_id},
        headers=auth(student_token),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "applied"
    assert body["match_score_at_apply"] >= 60.0


def test_apply_requires_visibility():
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _, student_token = register(client, "student")

    job_id = _post_job(client, company_token, apply_threshold=0.0)
    # Build a profile but do NOT turn visibility on
    client.put(
        "/students/me/profile",
        json={
            "university": "IUB", "degree": "BSCS", "graduation_year": 2024,
            "experience_years": 1.0, "summary": "x",
            "skills": ["Python"], "projects": [],
        },
        headers=auth(student_token),
    )
    res = client.post(
        "/students/me/applications",
        json={"job_id": job_id},
        headers=auth(student_token),
    )
    assert res.status_code == 403
