from fastapi.testclient import TestClient

from app.main import app
from tests.helpers import approve_all_companies, auth, register


def test_admin_disable_student_removes_from_student_jobs():
    """Disabling a student blocks them from seeing jobs and from the match list."""
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _, student_token = register(client, "student")
    _, admin_token = register(client, "admin")

    # Company posts a job
    job_res = client.post(
        "/companies/jobs",
        json={
            "title": "Eng", "required_skills": ["Python"],
            "experience_level": "entry", "education_requirement": "BSCS",
            "location": "Remote", "description": "x", "apply_threshold": 0.0,
        },
        headers=auth(company_token),
    )
    assert job_res.status_code == 200

    # Student sets up a visible profile
    client.put(
        "/students/me/profile",
        json={
            "university": "IUB", "degree": "BSCS", "graduation_year": 2024,
            "experience_years": 1.0, "summary": "x",
            "skills": ["Python"], "projects": [],
        },
        headers=auth(student_token),
    )
    client.patch("/students/me/visibility", json={"visibility_flag": True}, headers=auth(student_token))

    profile = client.get("/students/me/profile", headers=auth(student_token)).json()
    student_id = profile["id"]

    # Admin disables the student
    res = client.patch(
        f"/admin/students/{student_id}",
        json={"is_disabled": True},
        headers=auth(admin_token),
    )
    assert res.status_code == 200
    assert res.json()["is_disabled"] is True

    # Disabled student can no longer edit their profile
    res = client.put(
        "/students/me/profile",
        json={
            "university": "IUB", "degree": "BSCS", "graduation_year": 2024,
            "experience_years": 1.0, "summary": "x",
            "skills": ["Python"], "projects": [],
        },
        headers=auth(student_token),
    )
    assert res.status_code == 403


def test_admin_disable_job_hides_it_from_student_browse():
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _, student_token = register(client, "student")
    _, admin_token = register(client, "admin")

    job_res = client.post(
        "/companies/jobs",
        json={
            "title": "Eng", "required_skills": ["Python"],
            "experience_level": "entry", "education_requirement": "BSCS",
            "location": "Remote", "description": "x", "apply_threshold": 0.0,
        },
        headers=auth(company_token),
    )
    job_id = job_res.json()["id"]

    # Visible student to get matches running
    client.put(
        "/students/me/profile",
        json={
            "university": "IUB", "degree": "BSCS", "graduation_year": 2024,
            "experience_years": 1.0, "summary": "x",
            "skills": ["Python"], "projects": [],
        },
        headers=auth(student_token),
    )
    client.patch("/students/me/visibility", json={"visibility_flag": True}, headers=auth(student_token))

    # Before disable, student sees the job
    jobs_before = client.get("/students/me/jobs", headers=auth(student_token)).json()
    assert any(j["id"] == job_id for j in jobs_before)

    # Admin closes the job
    res = client.patch(f"/admin/jobs/{job_id}", json={"is_active": False}, headers=auth(admin_token))
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # Student no longer sees it
    jobs_after = client.get("/students/me/jobs", headers=auth(student_token)).json()
    assert not any(j["id"] == job_id for j in jobs_after)


def test_admin_company_disable_cascades_to_jobs():
    client = TestClient(app)
    _, company_token = register(client, "company")
    approve_all_companies()
    _, admin_token = register(client, "admin")

    job_res = client.post(
        "/companies/jobs",
        json={
            "title": "Eng", "required_skills": ["Python"],
            "experience_level": "entry", "education_requirement": "BSCS",
            "location": "Remote", "description": "x", "apply_threshold": 0.0,
        },
        headers=auth(company_token),
    )
    assert job_res.status_code == 200

    # Find the company_id via admin list
    companies = client.get("/admin/companies", headers=auth(admin_token)).json()
    assert companies, "admin should see registered companies"
    company_id = companies[0]["id"]

    # Disable the company
    res = client.patch(
        f"/admin/companies/{company_id}",
        json={"is_disabled": True},
        headers=auth(admin_token),
    )
    assert res.status_code == 200

    # All their jobs should now be inactive
    jobs = client.get("/admin/jobs", headers=auth(admin_token)).json()
    assert all(j["is_active"] is False for j in jobs if j["company_id"] == company_id)


def test_admin_analytics_reports_live_counts():
    client = TestClient(app)
    _, admin_token = register(client, "admin")
    _, _ = register(client, "student")
    _, company_token = register(client, "company")
    approve_all_companies()

    client.post(
        "/companies/jobs",
        json={
            "title": "Eng", "required_skills": ["Python"],
            "experience_level": "entry", "education_requirement": "BSCS",
            "location": "Remote", "description": "x", "apply_threshold": 0.0,
        },
        headers=auth(company_token),
    )

    body = client.get("/admin/analytics", headers=auth(admin_token)).json()
    assert body["students_total"] >= 1
    assert body["companies_verified"] >= 1
    assert body["jobs_active"] >= 1
