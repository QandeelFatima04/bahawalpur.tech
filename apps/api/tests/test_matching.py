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
    # weights: skill 0.40, project 0.25, education 0.20, experience 0.15
    # 50*0.40 + 50*0.25 + 100*0.20 + 50*0.15 = 60.0
    assert result["total_score"] == 60.0
