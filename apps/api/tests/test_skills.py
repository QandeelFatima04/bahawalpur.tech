from app.services.skills import (
    clean_skill_input,
    count_covered,
    normalize_skill,
    skill_is_covered,
    tokenize_skill,
)


def test_burpsuite_variants_match():
    # The literal production bug: candidate has "BurpSuite", job has "Burp Suite".
    assert normalize_skill("BurpSuite") == normalize_skill("Burp Suite")
    assert normalize_skill("Burp Suite") == normalize_skill("burp-suite")
    assert normalize_skill("BURPSUITE") == "burpsuite"


def test_zero_width_space_does_not_break_normalization():
    # Verified locally that the old regex did NOT strip U+200B and the resulting
    # canonical key "burp​suite" never matched the plain form.
    assert normalize_skill("Burp​Suite") == "burpsuite"
    assert normalize_skill("﻿BurpSuite") == "burpsuite"
    assert normalize_skill("Burp Suite") == "burpsuite"  # NBSP


def test_cross_site_scripting_aliases():
    assert normalize_skill("XSS") == "xss"
    assert normalize_skill("Cross-Site Scripting") == "xss"
    assert normalize_skill("Cross-Site Scripting (XSS)") == "xss"
    assert normalize_skill("cross site scripting") == "xss"


def test_sql_injection_aliases():
    assert normalize_skill("SQL Injection") == "sqlinjection"
    assert normalize_skill("SQLi") == "sqlinjection"
    assert normalize_skill("SQL Injection (SQLi)") == "sqlinjection"


def test_penetration_testing_alias():
    assert normalize_skill("Penetration Testing") == "pentesting"
    assert normalize_skill("pentest") == "pentesting"
    assert normalize_skill("Pen Test") == "pentesting"


def test_owasp_top_10_alias():
    assert normalize_skill("OWASP Top 10") == "owasptop10"
    assert normalize_skill("OWASPTop10") == "owasptop10"
    assert normalize_skill("OWASP Top Ten") == "owasptop10"


def test_tokenize_drops_parens_and_stopwords():
    assert tokenize_skill("Cross-Site Scripting (XSS)") == frozenset({"cross", "site", "scripting"})
    assert tokenize_skill("Web Penetration Testing") == frozenset({"web", "penetration", "testing"})
    assert tokenize_skill("Burp Suite") == frozenset({"burp", "suite"})
    assert tokenize_skill("BurpSuite") == frozenset({"burpsuite"})


def test_token_subset_covers_compound_skills():
    # Job needs "Penetration Testing"; candidate has the more specific compound.
    assert skill_is_covered("Penetration Testing", ["Web Penetration Testing"])
    assert skill_is_covered("Penetration Testing", ["Infrastructure Penetration Testing", "Linux"])
    assert skill_is_covered("Web Penetration Testing", ["Web Penetration Testing"])


def test_single_token_guard_blocks_false_positives():
    # "C" must NOT match "C++" or "Compliance" via token-subset, even though
    # "c" is a single-character token. Canonical key differs, so no match.
    assert not skill_is_covered("C", ["C++"])
    assert not skill_is_covered("C", ["Compliance"])
    # But "C++" still matches itself via canonical key.
    assert skill_is_covered("C++", ["C++"])
    assert skill_is_covered("C++", ["c++"])


def test_token_subset_does_not_overshoot():
    # Job "Web Application Security" {web, application, security} is NOT a
    # subset of candidate "Web Penetration Testing" {web, penetration, testing}.
    assert not skill_is_covered("Web Application Security", ["Web Penetration Testing"])


def test_canonical_key_wins_when_tokens_would_miss():
    # Job "Burp Suite" {burp, suite} vs candidate "BurpSuite" {burpsuite}.
    # Tokens are not a subset (different splits), but canonical keys match.
    assert skill_is_covered("Burp Suite", ["BurpSuite"])
    assert skill_is_covered("BurpSuite", ["Burp Suite"])


def test_clean_skill_input_strips_invisible():
    assert clean_skill_input("Burp​Suite") == "BurpSuite"
    assert clean_skill_input("  BurpSuite  ") == "BurpSuite"
    assert clean_skill_input("﻿Python") == "Python"
    # NFKC normalizes full-width digits / ligatures
    assert clean_skill_input("Ｐython") == "Python"
    assert clean_skill_input("") == ""
    assert clean_skill_input("   ") == ""


def test_count_covered_dedupes_canonical_keys():
    # Two job-skill rows that canonicalize to the same key should count once.
    job = ["Burp Suite", "BurpSuite", "Python"]
    cand = ["BurpSuite", "Python"]
    assert count_covered(job, cand) == 2  # burpsuite + python, not 3


def test_akshat_screenshot_scenario():
    """Reproduces exactly what the user reported in the screenshot."""
    candidate = [
        "BurpSuite", "Sqlmap", "Linux", "Python", "Metasploit",
        "Web Penetration Testing", "Infrastructure Penetration Testing",
        "Network Penetration Testing", "OWASP ZAP", "Java", "JavaScript",
    ]
    job = [
        "Burp Suite",
        "Cross-Site Scripting (XSS)",
        "Linux",
        "Metasploit",
        "Network Protocols",
        "OWASP Top 10",
        "Penetration Testing",
        "Python",
        "SQL Injection",
        "Web Application Security",
    ]
    # Burp Suite, Linux, Metasploit, Penetration Testing, Python → covered (5)
    # Cross-Site Scripting (XSS), Network Protocols, OWASP Top 10, SQL Injection,
    # Web Application Security → still missing (5)
    covered_skills = [s for s in job if skill_is_covered(s, candidate)]
    missing_skills = [s for s in job if not skill_is_covered(s, candidate)]

    assert "Burp Suite" in covered_skills
    assert "Linux" in covered_skills
    assert "Metasploit" in covered_skills
    assert "Penetration Testing" in covered_skills
    assert "Python" in covered_skills

    assert "Cross-Site Scripting (XSS)" in missing_skills
    assert "Network Protocols" in missing_skills
    assert "OWASP Top 10" in missing_skills
    assert "SQL Injection" in missing_skills
    assert "Web Application Security" in missing_skills

    assert count_covered(job, candidate) == 5
