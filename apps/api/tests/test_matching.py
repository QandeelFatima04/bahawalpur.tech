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
    assert result["total_score"] == 62.5
