"""Skill name normalization and canonicalization for matching.

Normalizes skill strings to a canonical form so that variants like
"BurpSuite", "Burp Suite", and "burp-suite" all compare as equal.

Also exposes a token-set view used for semantic subset matching, so that
a job requiring "Penetration Testing" is covered by a candidate skill of
"Web Penetration Testing".
"""
from __future__ import annotations

import re
import unicodedata

# Invisible / zero-width characters that survive .strip() and aren't matched by \s.
# Real-world resume parsers (especially copy-pastes from PDF) sometimes inject these.
_INVISIBLE = "".join([
    "​",  # ZERO WIDTH SPACE
    "‌",  # ZERO WIDTH NON-JOINER
    "‍",  # ZERO WIDTH JOINER
    "⁠",  # WORD JOINER
    "﻿",  # BOM / ZWNBSP
    "­",  # SOFT HYPHEN
])
_INVISIBLE_RE = re.compile(f"[{re.escape(_INVISIBLE)}]")

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
    # OWASP Top 10
    "owasptop10": "owasptop10",
    "owasptopten": "owasptop10",
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
    # Cross-Site Scripting
    "xss": "xss",
    "crosssitescripting": "xss",
    "crosssitescripting(xss)": "xss",
    # SQL Injection
    "sqli": "sqlinjection",
    "sqlinjection": "sqlinjection",
    "sqlinjection(sqli)": "sqlinjection",
    # Penetration Testing (base)
    "pentest": "pentesting",
    "pentesting": "pentesting",
    "penetrationtesting": "pentesting",
    # Web Application Security
    "webappsec": "webapplicationsecurity",
    "webapplicationsecurity": "webapplicationsecurity",
    # Network Protocols
    "networkprotocols": "networkprotocols",
}

# Token-level stop words dropped before tokenize_skill() returns its set.
_STOP_TOKENS: frozenset[str] = frozenset({"and", "or", "the", "of", "a", "an", "for"})

# Parenthesized clarifiers like "Cross-Site Scripting (XSS)" → "Cross-Site Scripting".
_PARENS_RE = re.compile(r"\s*\([^)]*\)")


def clean_skill_input(s: str) -> str:
    """Sanitize a user-supplied or AI-extracted skill string for storage.

    Applies NFKC normalization (collapses curly quotes, ligatures, full-width
    chars) and removes invisible Unicode characters that pollute matching but
    are otherwise undetectable in UI chips. Preserves display casing/spacing.
    """
    if not s:
        return ""
    s = unicodedata.normalize("NFKC", s)
    s = _INVISIBLE_RE.sub("", s)
    return s.strip()


def normalize_skill(skill: str) -> str:
    """Return a canonical key for a skill string for comparison purposes.

    Steps:
    1. NFKC-normalize and strip invisible Unicode.
    2. Lowercase and strip whitespace.
    3. Remove spaces, hyphens, underscores, dots, slashes (collapse to run).
    4. Look up in alias table; fall back to the stripped form.
    """
    if not skill:
        return ""
    s = clean_skill_input(skill).lower()
    stripped = re.sub(r"[\s\-_./]+", "", s)
    return _ALIASES.get(stripped) or _ALIASES.get(s) or stripped


def normalize_skills(skills: list[str]) -> set[str]:
    """Normalize a list of skill strings into a set of canonical keys."""
    return {normalize_skill(s) for s in skills if s and s.strip()}


def tokenize_skill(skill: str) -> frozenset[str]:
    """Return the token bag for a skill, used for subset semantic matching.

    "Web Penetration Testing" → {"web", "penetration", "testing"}
    "Cross-Site Scripting (XSS)" → {"cross", "site", "scripting"}   (parens dropped)
    "BurpSuite"                 → {"burpsuite"}                     (no boundary to split)
    """
    if not skill:
        return frozenset()
    s = clean_skill_input(skill).lower()
    s = _PARENS_RE.sub("", s)
    tokens = {t for t in re.split(r"[^a-z0-9+#]+", s) if t and t not in _STOP_TOKENS}
    return frozenset(tokens)


def skill_is_covered(job_skill: str, candidate_skills: list[str]) -> bool:
    """Return True if `job_skill` is covered by any string in `candidate_skills`.

    Coverage rules (any one wins):
      (a) Canonical-key equality after `normalize_skill`.
      (b) Token-subset: job_skill's token set ⊆ candidate skill's token set,
          AND the job_skill has ≥2 tokens. The 2-token floor blocks
          single-token false positives (e.g. "C" matching "C++" or "Compliance").
    """
    job_key = normalize_skill(job_skill)
    if not job_key:
        return False
    job_tokens = tokenize_skill(job_skill)
    for cand in candidate_skills:
        if normalize_skill(cand) == job_key:
            return True
        if len(job_tokens) >= 2:
            cand_tokens = tokenize_skill(cand)
            if cand_tokens and job_tokens.issubset(cand_tokens):
                return True
    return False


def count_covered(job_skills: list[str], candidate_skills: list[str]) -> int:
    """Number of distinct job skills covered by the candidate (deduped by canonical key)."""
    seen_keys: set[str] = set()
    covered = 0
    for j in job_skills:
        key = normalize_skill(j)
        if not key or key in seen_keys:
            continue
        seen_keys.add(key)
        if skill_is_covered(j, candidate_skills):
            covered += 1
    return covered


def distinct_count(skills: list[str]) -> int:
    """Distinct canonical-key count for a list of skill strings."""
    return len({k for k in (normalize_skill(s) for s in skills) if k})
