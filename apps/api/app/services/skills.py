"""Skill name normalization and canonicalization for matching.

Normalizes skill strings to a canonical form so that variants like
"BurpSuite", "Burp Suite", and "burp-suite" all compare as equal.
"""
from __future__ import annotations

import re

# Map normalized-stripped form (or lowercased original) → canonical key used for comparison.
# All keys must already be in their stripped+lowercased form (no spaces/hyphens).
_ALIASES: dict[str, str] = {
    # Burp Suite
    "burpsuite": "burpsuite",
    "burp-suite": "burpsuite",
    # JavaScript / TypeScript
    "js": "javascript",
    "javascript": "javascript",
    "ts": "typescript",
    "typescript": "typescript",
    # Python
    "py": "python",
    "python": "python",
    # PostgreSQL
    "postgres": "postgresql",
    "postgresql": "postgresql",
    # OWASP ZAP
    "zap": "owaspzap",
    "owaspzap": "owaspzap",
    "owaspzapproxy": "owaspzap",
    "zedattackproxy": "owaspzap",
    # Kubernetes
    "k8s": "kubernetes",
    "kube": "kubernetes",
    "kubernetes": "kubernetes",
    # React
    "reactjs": "reactjs",
    "react.js": "reactjs",
    # Node.js
    "nodejs": "nodejs",
    "node.js": "nodejs",
    # Next.js
    "nextjs": "nextjs",
    "next.js": "nextjs",
    # Vue.js
    "vuejs": "vuejs",
    "vue.js": "vuejs",
    # CI/CD
    "ci/cd": "cicd",
    "cicd": "cicd",
    # Machine Learning
    "ml": "machinelearning",
    "machinelearning": "machinelearning",
    # Artificial Intelligence
    "ai": "artificialintelligence",
    "artificialintelligence": "artificialintelligence",
    # C++ / C#
    "c++": "cplusplus",
    "cplusplus": "cplusplus",
    "c#": "csharp",
    "csharp": "csharp",
    # .NET
    ".net": "dotnet",
    "dotnet": "dotnet",
    # AWS variants
    "amazonwebservices": "aws",
    "aws": "aws",
    # Google Cloud
    "gcp": "googlecloud",
    "googlecloud": "googlecloud",
    "googlecloudplatform": "googlecloud",
}


def normalize_skill(skill: str) -> str:
    """Return a canonical key for a skill string for comparison purposes.

    Steps:
    1. Lowercase and strip whitespace.
    2. Remove spaces, hyphens, underscores, dots, slashes (collapse to run).
    3. Look up in alias table; fall back to the stripped form.
    """
    s = skill.strip().lower()
    stripped = re.sub(r"[\s\-_./]+", "", s)
    # Check alias by stripped form first, then by original lowercased (handles "owasp zap" key)
    return _ALIASES.get(stripped) or _ALIASES.get(s) or stripped


def normalize_skills(skills: list[str]) -> set[str]:
    """Normalize a list of skill strings into a set of canonical keys."""
    return {normalize_skill(s) for s in skills if s and s.strip()}
