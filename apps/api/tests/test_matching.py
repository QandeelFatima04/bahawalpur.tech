from types import SimpleNamespace

from app.services.matching import _score


def test_weighted_matching_score():
    candidate = SimpleNamespace(
        skills=[SimpleNamespace(name="Python"), SimpleNamespace(name="FastAPI")],
        projects=[SimpleNamespace(technologies=["Python", "PostgreSQL"])],
        degree="BSCS",
        experience_years=1.0,
    )
    job = SimpleNamespace(skills=[SimpleNamespace(name="Python"), SimpleNamespace(name="React")])
    result = _score(candidate, job)
    assert result["skill_score"] == 50.0
    assert result["project_score"] == 50.0
    assert result["education_score"] == 100
    assert result["experience_score"] == 50.0
    # 50*0.40 + 50*0.25 + 100*0.20 + 50*0.15 = 60.0
    assert result["total_score"] == 60.0


def test_canonicalization_lifts_score():
    # Same candidate/job pair, but the candidate's "BurpSuite" should now be
    # treated as covering the job's "Burp Suite" requirement (canonical key match).
    candidate = SimpleNamespace(
        skills=[SimpleNamespace(name="BurpSuite"), SimpleNamespace(name="Python")],
        projects=[],
        degree="BSCS",
        experience_years=2.0,
    )
    job = SimpleNamespace(skills=[SimpleNamespace(name="Burp Suite"), SimpleNamespace(name="Python")])
    result = _score(candidate, job)
    assert result["skill_score"] == 100.0  # 2 of 2 covered


def test_token_subset_lifts_score():
    # Job requires the BROAD "Penetration Testing"; candidate only has compound forms.
    # Token-subset rule should still count it as covered.
    candidate = SimpleNamespace(
        skills=[
            SimpleNamespace(name="Web Penetration Testing"),
            SimpleNamespace(name="Python"),
        ],
        projects=[],
        degree="BSCS",
        experience_years=2.0,
    )
    job = SimpleNamespace(skills=[SimpleNamespace(name="Penetration Testing"), SimpleNamespace(name="Python")])
    result = _score(candidate, job)
    assert result["skill_score"] == 100.0


def test_akshat_screenshot_full_score():
    """The exact reported case: 5 of 10 job skills should now be covered."""
    candidate = SimpleNamespace(
        skills=[
            SimpleNamespace(name=n) for n in [
                "BurpSuite", "Sqlmap", "Linux", "Python", "Metasploit",
                "Web Penetration Testing", "Infrastructure Penetration Testing",
                "Network Penetration Testing", "OWASP ZAP", "Java",
            ]
        ],
        projects=[],
        degree="BTech",
        experience_years=4.5,
    )
    job = SimpleNamespace(
        skills=[
            SimpleNamespace(name=n) for n in [
                "Burp Suite", "Cross-Site Scripting (XSS)", "Linux",
                "Metasploit", "Network Protocols", "OWASP Top 10",
                "Penetration Testing", "Python", "SQL Injection",
                "Web Application Security",
            ]
        ]
    )
    result = _score(candidate, job)
    # 5 of 10 covered → 50% skill_score (was 30% with only literal matching)
    assert result["skill_score"] == 50.0
