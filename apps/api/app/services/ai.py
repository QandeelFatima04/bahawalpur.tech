from __future__ import annotations

import io
import json
import re

from openai import OpenAI

from ..config import get_settings

settings = get_settings()


RESUME_PROMPT = """You are an expert resume parser. Extract a structured JSON profile from the resume below.

Return ONLY valid JSON. No explanation, no extra text. All keys must be present (use null or empty
array when something is not in the resume).

Schema:
{
  "summary": string,
  "skills": string[],
  "projects": [{"title": string, "technologies": string[], "description": string}],
  "university": string|null,
  "degree": string|null,
  "graduation_year": integer|null,
  "experience_years": number,
  "current_location": string|null,
  "linkedin_url": string|null,
  "github_url": string|null,
  "portfolio_url": string|null
}

Rules for `skills` — THIS IS CRITICAL:
- Include EVERY technical item mentioned ANYWHERE in the resume, including under headings like
  "Tools", "Technologies", "Frameworks", "Platforms", "AI Tools", "Libraries", "Software", "IDEs",
  "Databases", "Languages", or free text.
- This includes: programming languages (Python, JavaScript), frameworks (React, Django, Flask),
  databases (PostgreSQL, MongoDB), cloud services (AWS, GCP), dev tools (Git, Docker, Kubernetes),
  AI tools and LLM products (ChatGPT, Claude, Gemini, Copilot, Cursor, Midjourney), IDEs (VS Code,
  IntelliJ), operating systems (Linux), and any other named tool or technology.
- Normalize capitalization (e.g. JS -> JavaScript, py -> Python, postgres -> PostgreSQL).
- Deduplicate (case-insensitive) but preserve canonical casing.
- Do NOT include soft skills (e.g. Communication, Teamwork) in `skills`.

Rules for `summary` — write 2-3 sentences grounded in THIS resume:
- Describe this specific candidate: their discipline, what they've worked on, and standout strengths.
- Do NOT use generic filler like "Entry-level software candidate profile generated from resume".
- If the candidate is a fresher with little experience, frame it around their degree, projects, and
  technical foundation — that is positive, not a weakness.

Rules for `current_location`:
- Extract the city (and country if listed) from the resume header or contact section.
- Use just the city, e.g. "Bahawalpur, Pakistan" or "Lahore". Do NOT include street addresses,
  postal codes, phone numbers, or email.

Rules for URLs:
- `linkedin_url`: the full LinkedIn profile URL if present (e.g. https://linkedin.com/in/...).
- `github_url`: the full GitHub profile URL if present.
- `portfolio_url`: any personal website, blog, or portfolio URL that is not LinkedIn or GitHub.
- Return null if the resume does not contain the URL. Do NOT fabricate or guess.

Other rules:
- `projects.technologies` lists the tools/tech used in each specific project.
- `experience_years` is the candidate's total professional experience in years (0 for freshers with
  only coursework/projects; count internships as 0.5 each).
- `graduation_year` is a four-digit year or null.
- Do NOT extract phone numbers, email, home address, or date of birth — these are private.
"""


REPORT_PROMPT = """You are a career coach. Given the candidate profile JSON, produce a readiness report.

Return ONLY valid JSON. No explanation, no extra text.

Schema:
{
  "professional_summary": string,
  "suggested_paths": string[],
  "skill_gaps": string[],
  "resume_suggestions": string[]
}
"""


JOB_DESCRIPTION_PROMPT = """You are an expert technical recruiter. Given a job role name (and optional
seniority hint), draft a complete job description for a Pakistan-based tech employer hiring fresh
graduates and early-career professionals.

Return ONLY valid JSON. No prose, no markdown fences. Every key must be present (use null, "", or
[] when not applicable).

Schema:
{
  "title": string,
  "job_summary": string,
  "key_responsibilities": string[],
  "required_skills": string[],
  "preferred_skills": string[],
  "experience_level": "entry"|"mid"|"senior"|"lead",
  "required_experience_years": number,
  "education_requirement": string,
  "employment_type": "full_time"|"part_time"|"contract"|"internship",
  "work_mode": "onsite"|"remote"|"hybrid",
  "salary_range": string|null,
  "location": string|null,
  "benefits": string[],
  "career_growth_path": string,
  "department": string,
  "seniority_level": "junior"|"mid"|"senior"|"lead",
  "interview_process": string[],
  "tags": string[]
}

Rules:
- key_responsibilities: 5-8 bullets, each <= 20 words, action-oriented.
- required_skills: 5-10 specific technical skills with canonical casing (e.g. "JavaScript",
  "PostgreSQL"). No soft skills.
- preferred_skills: 3-6 nice-to-haves.
- benefits: 3-6 realistic perks.
- interview_process: 3-5 ordered stages.
- tags: 5-10 lowercase keywords for search.
- If the role name is gibberish, ambiguous, or not a real job (e.g. "asdf", "ceo of the universe"),
  return exactly {"error": "unrecognized_role"} and nothing else.
- Keep all content professional and free of discriminatory language (no age, gender, religion,
  nationality requirements).
- Do not invent specific company names.
"""


# Fields the LLM is expected to return. Used to validate + normalize the response and to seed the
# fallback template so both code paths return the same shape.
JOB_DRAFT_KEYS: tuple[str, ...] = (
    "title",
    "job_summary",
    "key_responsibilities",
    "required_skills",
    "preferred_skills",
    "experience_level",
    "required_experience_years",
    "education_requirement",
    "employment_type",
    "work_mode",
    "salary_range",
    "location",
    "benefits",
    "career_growth_path",
    "department",
    "seniority_level",
    "interview_process",
    "tags",
)


# Hand-written templates so the feature still works when OPENAI_API_KEY is unset or the API call
# fails. Keyed off normalized substrings — picked the rough discipline if no keyword matches.
_FALLBACK_TEMPLATES: dict[str, dict] = {
    "software": {
        "department": "Engineering",
        "required_skills": ["Python", "JavaScript", "Git", "SQL", "REST APIs"],
        "preferred_skills": ["FastAPI", "React", "Docker", "PostgreSQL"],
        "key_responsibilities": [
            "Build and maintain backend services and REST APIs",
            "Write unit and integration tests for new and existing features",
            "Participate in code reviews and architectural discussions",
            "Debug production issues and contribute to incident retrospectives",
            "Collaborate with product, design, and QA on feature delivery",
        ],
        "tags": ["software", "backend", "engineering", "python"],
    },
    "data": {
        "department": "Data",
        "required_skills": ["Python", "SQL", "Pandas", "Excel", "Statistics"],
        "preferred_skills": ["Power BI", "Tableau", "scikit-learn", "Airflow"],
        "key_responsibilities": [
            "Pull, clean, and transform data from internal sources",
            "Build dashboards and reports for business stakeholders",
            "Run exploratory analyses to surface trends and anomalies",
            "Document data definitions and analysis methodology",
            "Partner with engineering on data-quality improvements",
        ],
        "tags": ["data", "analytics", "sql", "python"],
    },
    "design": {
        "department": "Design",
        "required_skills": ["Figma", "Wireframing", "Prototyping", "User Research", "Design Systems"],
        "preferred_skills": ["Accessibility", "Motion Design", "HTML", "CSS"],
        "key_responsibilities": [
            "Translate product requirements into wireframes and high-fidelity mockups",
            "Run usability studies and synthesize feedback into design changes",
            "Maintain and extend the team design system",
            "Collaborate with engineers on implementation details",
            "Present design rationale to stakeholders",
        ],
        "tags": ["design", "ux", "ui", "figma"],
    },
    "security": {
        "department": "Security",
        "required_skills": ["Networking", "Linux", "Python", "OWASP Top 10", "SIEM"],
        "preferred_skills": ["Burp Suite", "Wireshark", "Cloud Security", "Incident Response"],
        "key_responsibilities": [
            "Triage and investigate security alerts from monitoring tools",
            "Run vulnerability scans and coordinate remediation",
            "Document incidents and contribute to post-mortems",
            "Help maintain access controls and security baselines",
            "Stay current on emerging threats and recommend mitigations",
        ],
        "tags": ["cybersecurity", "infosec", "soc"],
    },
    "marketing": {
        "department": "Marketing",
        "required_skills": ["Content Writing", "SEO", "Google Analytics", "Social Media", "Email Marketing"],
        "preferred_skills": ["HubSpot", "Canva", "Meta Ads", "Copywriting"],
        "key_responsibilities": [
            "Plan and execute multi-channel marketing campaigns",
            "Track campaign performance and report against KPIs",
            "Collaborate with design on creative assets",
            "Manage editorial calendar and publish content",
            "Coordinate with sales on lead handoff",
        ],
        "tags": ["marketing", "content", "seo", "growth"],
    },
}


def _fallback_job_description(role_name: str, seniority_hint: str | None) -> dict:
    """Deterministic stub returned when the LLM is unavailable. Keeps the same shape as the LLM
    response so the caller can treat both paths identically."""
    role = (role_name or "").strip()
    role_lower = role.lower()

    # Pick the closest template by keyword. Default to a generic professional shape.
    template_key = next((k for k in _FALLBACK_TEMPLATES if k in role_lower), None)
    template = _FALLBACK_TEMPLATES.get(template_key, {
        "department": "Operations",
        "required_skills": ["Communication", "Problem Solving", "MS Office"],
        "preferred_skills": ["Project Management", "Data Literacy"],
        "key_responsibilities": [
            "Own day-to-day execution of role-specific tasks",
            "Coordinate with cross-functional teams to unblock work",
            "Document processes and contribute to team knowledge base",
            "Report progress and risks to your manager weekly",
            "Continuously identify opportunities to improve workflows",
        ],
        "tags": ["operations"],
    })

    seniority = (seniority_hint or "junior").lower()
    experience_level = seniority if seniority in {"entry", "mid", "senior", "lead"} else (
        "entry" if seniority in {"junior", "fresher", "graduate"} else "mid"
    )
    seniority_level = (
        "junior" if experience_level == "entry"
        else experience_level if experience_level in {"mid", "senior", "lead"}
        else "junior"
    )
    experience_years = {"entry": 0, "mid": 2, "senior": 5, "lead": 8}.get(experience_level, 0)

    title_role = role.title() if role else "Professional"
    return {
        "title": title_role,
        "job_summary": (
            f"We are hiring a {title_role} to join our team. You will work alongside experienced "
            "colleagues, deliver work that matters, and grow your career in a supportive environment."
        ),
        "key_responsibilities": list(template["key_responsibilities"]),
        "required_skills": list(template["required_skills"]),
        "preferred_skills": list(template["preferred_skills"]),
        "experience_level": experience_level,
        "required_experience_years": experience_years,
        "education_requirement": "Bachelor's degree in a relevant field",
        "employment_type": "full_time",
        "work_mode": "hybrid",
        "salary_range": None,
        "location": "Pakistan",
        "benefits": ["Health insurance", "Annual leave", "Learning budget", "Provident fund"],
        "career_growth_path": (
            f"Grow from {seniority_level} to senior within 2-3 years, with a path toward team lead "
            "or specialist tracks based on your strengths."
        ),
        "department": template["department"],
        "seniority_level": seniority_level,
        "interview_process": [
            "Screening call",
            "Technical or role-specific assessment",
            "Hiring manager interview",
            "Final round with team",
        ],
        "tags": list(template["tags"]) + [seniority_level],
    }


def _coerce_job_draft(data: dict, role_name: str, seniority_hint: str | None) -> dict:
    """Make the LLM response defensive: ensure all keys exist, fix simple type issues, fill blanks
    from the fallback template so the UI can rely on a consistent shape."""
    fallback = _fallback_job_description(role_name, seniority_hint)
    out: dict = {}
    for key in JOB_DRAFT_KEYS:
        value = data.get(key, fallback[key])
        expected = fallback[key]
        if isinstance(expected, list) and not isinstance(value, list):
            value = fallback[key]
        elif isinstance(expected, str) and value is not None and not isinstance(value, str):
            value = str(value)
        elif isinstance(expected, (int, float)) and not isinstance(value, (int, float)):
            try:
                value = float(value)
            except (TypeError, ValueError):
                value = fallback[key]
        out[key] = value
    return out


def generate_job_description(role_name: str, seniority_hint: str | None = None) -> dict:
    """Return {ok: bool, used_fallback: bool, draft: dict|None, error: str|None, tokens_used: int|None}.

    Never raises — the caller (HTTP layer) gets a structured result it can log + map to a response.
    """
    role_name = (role_name or "").strip()
    if not role_name:
        return {"ok": False, "used_fallback": False, "draft": None, "error": "empty_role", "tokens_used": None}

    if not settings.openai_api_key:
        return {
            "ok": True,
            "used_fallback": True,
            "draft": _fallback_job_description(role_name, seniority_hint),
            "error": None,
            "tokens_used": None,
        }

    user_payload = json.dumps({"role_name": role_name[:100], "seniority_hint": seniority_hint})
    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=1500,
            messages=[
                {"role": "system", "content": JOB_DESCRIPTION_PROMPT},
                {"role": "user", "content": user_payload},
            ],
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        tokens = getattr(getattr(response, "usage", None), "total_tokens", None)

        if isinstance(data, dict) and data.get("error") == "unrecognized_role":
            return {
                "ok": False,
                "used_fallback": False,
                "draft": None,
                "error": "unrecognized_role",
                "tokens_used": tokens,
            }

        return {
            "ok": True,
            "used_fallback": False,
            "draft": _coerce_job_draft(data, role_name, seniority_hint),
            "error": None,
            "tokens_used": tokens,
        }
    except Exception as exc:
        return {
            "ok": True,
            "used_fallback": True,
            "draft": _fallback_job_description(role_name, seniority_hint),
            "error": str(exc)[:500],
            "tokens_used": None,
        }


def extract_text_from_bytes(contents: bytes, content_type: str, filename: str) -> str:
    name = (filename or "").lower()
    ctype = (content_type or "").lower()

    if name.endswith(".pdf") or "pdf" in ctype:
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(contents))
            pages = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    pages.append(page_text)
            return "\n".join(pages)
        except Exception:
            return contents.decode("utf-8", errors="ignore")

    if name.endswith(".docx") or "officedocument.wordprocessingml" in ctype:
        try:
            import docx

            document = docx.Document(io.BytesIO(contents))
            return "\n".join(p.text for p in document.paragraphs if p.text)
        except Exception:
            return contents.decode("utf-8", errors="ignore")

    return contents.decode("utf-8", errors="ignore")


PK_CITIES = [
    "Bahawalpur", "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Sargodha",
]

# (Canonical name, list of case-insensitive patterns that should be matched.)
PK_UNIVERSITIES = [
    ("Islamia University of Bahawalpur", ["Islamia University of Bahawalpur", r"\bIUB\b"]),
    ("Lahore University of Management Sciences", [r"\bLUMS\b", "Lahore University of Management Sciences"]),
    ("National University of Sciences and Technology", [r"\bNUST\b", "National University of Sciences and Technology"]),
    ("FAST-NUCES", [r"\bFAST(?:-NUCES)?\b", "National University of Computer and Emerging Sciences"]),
    ("COMSATS University", [r"\bCOMSATS\b"]),
    ("University of Engineering and Technology", [r"\bUET\b", "University of Engineering and Technology"]),
    ("University of the Punjab", ["University of the Punjab", "Punjab University", r"\bPU\b"]),
    ("University of Karachi", ["University of Karachi"]),
    ("Bahauddin Zakariya University", ["Bahauddin Zakariya University", r"\bBZU\b"]),
    ("Institute of Business Administration", [r"\bIBA\b", "Institute of Business Administration"]),
    ("Bahria University", ["Bahria University"]),
    ("Government College University", [r"\bGCU\b", "Government College University"]),
    ("University of Management and Technology", [r"\bUMT\b", "University of Management and Technology"]),
    ("GIFT University", ["GIFT University"]),
    ("Information Technology University", [r"\bITU\b", "Information Technology University"]),
    ("Air University", ["Air University"]),
    ("Quaid-i-Azam University", ["Quaid-i-Azam University"]),
    ("Virtual University", [r"\bVU\b", "Virtual University"]),
]

DEGREE_PATTERNS = [
    # Common abbreviations
    (r"\bB\.?S\.?\s*C\.?S\.?\b", "BSCS"),
    (r"\bB\.?S\.?\s*S\.?E\.?\b", "BSSE"),
    (r"\bB\.?S\.?\s*I\.?T\.?\b", "BSIT"),
    (r"\bB\.?S\.?\s*E\.?E\.?\b", "BSEE"),
    (r"\bM\.?S\.?\s*C\.?S\.?\b", "MSCS"),
    (r"\bBBA\b", "BBA"),
    (r"\bMBA\b", "MBA"),
    (r"\bPh\.?D\b", "PhD"),
]

# Full-form degrees ("Bachelor of Science in Computer Science", etc.)
DEGREE_FULL_RE = re.compile(
    r"\b(?:Bachelor(?:'s)?|Master(?:'s)?)\s+(?:of|in|'s\s+in)\s+"
    r"(?:Science\s+(?:in|of)\s+)?[A-Za-z][A-Za-z &]{2,60}",
    flags=re.I,
)

# Pattern like "BS Software Engineering", "MS Data Science", "BSc (Computer Science)".
# Requires case-sensitive matching (don't lowercase BS or field names) so we catch the
# canonical form in the CV. The separator allows multiple whitespace chars because pypdf
# often extracts text with double-spaces between words.
DEGREE_PROGRAM_RE = re.compile(
    r"\b(BS|BSc|BA|MS|MSc|MA|MBA|BBA|BE|ME|PhD|BTech|MTech)\b"
    r"\s*\(?\s*"
    r"([A-Z][a-z]+(?:[-\s]+[A-Z][a-z]+){1,4})"  # require at least 1 additional word, e.g. "Software Engineering"
)


SECTION_ANCHORS = [
    ("objective", r"(?:CAREER\s+)?OBJECTIVE|PROFESSIONAL\s+SUMMARY|SUMMARY|PROFILE|ABOUT"),
    ("education", r"EDUCATION(?:\s+(?:AND|&)\s+QUALIFICATIONS)?|ACADEMIC\s+BACKGROUND|QUALIFICATIONS"),
    ("skills", r"(?:TECHNICAL\s+)?SKILLS|COMPETENCIES|EXPERTISE|CORE\s+SKILLS"),
    ("projects", r"(?:ACADEMIC\s+|NOTABLE\s+|KEY\s+|PERSONAL\s+|FEATURED\s+|SELECTED\s+)?PROJECTS?"),
    ("experience", r"(?:WORK\s+|PROFESSIONAL\s+)?EXPERIENCE|EMPLOYMENT|WORK\s+HISTORY"),
    ("achievements", r"ACHIEVEMENTS(?:\s+(?:AND|&)\s+ACTIVITIES)?|AWARDS|ACTIVITIES|CERTIFICATIONS|HONORS"),
    ("languages", r"LANGUAGES"),
    ("interests", r"INTERESTS|HOBBIES"),
    ("references", r"REFERENCES"),
]


def _normalize(text: str) -> str:
    """Collapse runs of whitespace (including emojis/odd chars) down to single spaces."""
    return re.sub(r"\s+", " ", text).strip()


def _find_anchor_matches(joined: str, flags: int) -> list[tuple[int, int, str]]:
    matches: list[tuple[int, int, str]] = []
    for key, pattern in SECTION_ANCHORS:
        for m in re.finditer(rf"\b(?:{pattern})\b", joined, flags=flags):
            matches.append((m.start(), m.end(), key))
    matches.sort()
    return matches


def _split_sections(text: str) -> dict[str, str]:
    """Return {section_key: section_body} split on known keyword headings.

    Works when pypdf mashes multiple lines into one (common with PDFs that use icons
    or emojis next to section headings).

    Prefers case-sensitive UPPERCASE matches first — modern CVs almost always use
    all-caps section headings ("EDUCATION", "ACADEMIC PROJECTS"). That avoids false
    positives from occurrences of "Project" / "Language" in the middle of body text.
    Falls back to case-insensitive matching if the CV isn't using uppercase headings.
    """
    joined = _normalize(text)
    matches = _find_anchor_matches(joined, flags=0)
    if len(matches) < 3:
        matches = _find_anchor_matches(joined, flags=re.I)

    sections: dict[str, str] = {}
    for i, (_, end, key) in enumerate(matches):
        next_start = matches[i + 1][0] if i + 1 < len(matches) else len(joined)
        body = joined[end:next_start].strip(" :-&")
        if body and key not in sections:
            sections[key] = body
    return sections


def _first_match(pattern: str, text: str) -> str | None:
    m = re.search(pattern, text, flags=re.I)
    return m.group(0).strip() if m else None


def _detect_location(text: str) -> str | None:
    # Pick the city that appears earliest in the text (typically the CV header).
    # Avoid false positives where the city is embedded inside a university name.
    earliest_pos = None
    earliest_city = None
    for city in PK_CITIES:
        for m in re.finditer(rf"\b{re.escape(city)}\b", text, flags=re.I):
            start = m.start()
            window = text[max(0, start - 30): start + len(city) + 30]
            # Skip matches immediately followed/preceded by "University"
            if re.search(r"University", window, flags=re.I):
                continue
            if earliest_pos is None or start < earliest_pos:
                earliest_pos = start
                earliest_city = city
    return f"{earliest_city}, Pakistan" if earliest_city else None


def _detect_university(text: str) -> str | None:
    for canonical, patterns in PK_UNIVERSITIES:
        for pat in patterns:
            if re.search(pat, text, flags=re.I):
                return canonical
    # Generic fallback: "X University" or "University of X" pattern
    generic = re.search(
        r"\b(?:University of [A-Z][A-Za-z& ]{2,40}|[A-Z][A-Za-z&]{2,30} University)\b",
        text,
    )
    if generic:
        return generic.group(0).strip()
    return None


def _detect_degree(text: str) -> str | None:
    # Try "BS/MS/BSc + Field" patterns first — most explicit form on student CVs
    m = DEGREE_PROGRAM_RE.search(text)
    if m:
        return f"{m.group(1)} {m.group(2)}".strip()
    # Fall back to common abbreviations
    for pattern, canonical in DEGREE_PATTERNS:
        if re.search(pattern, text, flags=re.I):
            return canonical
    # Fall back to full-form phrases like "Bachelor of Science in Computer Science"
    m = DEGREE_FULL_RE.search(text)
    if m:
        return " ".join(m.group(0).split())
    return None


def _detect_experience_years(text: str) -> float:
    m = re.search(r"(\d+(?:\.\d+)?)\s*\+?\s*years?(?:\s+of)?\s+experience", text, flags=re.I)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    # Each "Intern" / "Internship" entry counts as 0.5 years
    internships = len(re.findall(r"\b(?:Intern|Internship)\b", text, flags=re.I))
    return min(internships * 0.5, 3.0)


# Header pattern for a project entry on a single-line section body, e.g.
# "Job Portal System | Final Year Project | 2025" or "Library Management System | 2024".
# Matches the title (without pipes) followed by a pipe, optional middle meta (also piped),
# and a 4-digit year.
PROJECT_HEADER_RE = re.compile(
    r"([A-Z][A-Za-z0-9 /&.\-]{2,70}?)"        # title (no pipes)
    r"\s*\|\s*"                                 # first pipe
    r"(?:[^|]{1,60}\|\s*)?"                     # optional middle piece with its own pipe
    r"(\d{4})"                                   # year
)

# Common verbs that introduce project descriptions — the tech list ends just before one.
DESCRIPTION_VERBS = (
    r"Developed|Built|Created|Implemented|Designed|Engineered|Architected|Worked|"
    r"Led|Managed|Integrated|Deployed|Optimized|Contributed"
)

TECH_IN_BODY_RE = re.compile(
    r"(?:Technologies\s+Used|Tech\s+Stack|Technologies|Tools|Built\s+with|Stack)\s*[:\-]\s*"
    rf"(.+?)(?=\s+(?:{DESCRIPTION_VERBS})\b|\.\s+[A-Z]|$)",
    flags=re.I,
)

# Pattern used to clean a leftover tech-list prefix off a description string, e.g. turning
# "Node.js, MongoDB Developed a web-based..." into "Developed a web-based...".
DESCRIPTION_LEAD_CLEANUP_RE = re.compile(
    rf"^(?:[A-Za-z0-9+.#]+(?:\s*,\s*[A-Za-z0-9+.#]+){{0,6}}\s+)?(?={DESCRIPTION_VERBS}\b)",
)


def _detect_projects(sections: dict[str, str], known_skills: list[str]) -> list[dict]:
    section = sections.get("projects", "")
    if not section:
        return []

    matches = list(PROJECT_HEADER_RE.finditer(section))
    if not matches:
        return []

    projects: list[dict] = []
    for i, m in enumerate(matches):
        title = m.group(1).strip()
        body_start = m.end()
        body_end = matches[i + 1].start() if i + 1 < len(matches) else len(section)
        body = section[body_start:body_end].strip()

        technologies: list[str] = []
        tech_match = TECH_IN_BODY_RE.search(body)
        if tech_match:
            technologies = [t.strip() for t in re.split(r"[,;/]", tech_match.group(1)) if t.strip()]
            description = (body[: tech_match.start()] + " " + body[tech_match.end():]).strip()
        else:
            description = body.strip()

        # Scrub any leftover "Node.js, MongoDB " prefix that the tech-line regex couldn't
        # eat (common when the CV has no line breaks between the tech list and description).
        description = DESCRIPTION_LEAD_CLEANUP_RE.sub("", description)
        # Also strip trailing emoji/section icons that pypdf leaves behind.
        description = re.sub(r"\s*[^\w.,;!?'\"()\-\s]+\s*$", "", description).strip()

        # Auto-tag any known skills mentioned in the title + body.
        blob = (title + " " + description).lower()
        tech_lookup = {t.lower() for t in technologies}
        for skill in known_skills:
            if skill.lower() in tech_lookup:
                continue
            if re.search(rf"\b{re.escape(skill)}\b", blob, flags=re.I):
                technologies.append(skill)
                tech_lookup.add(skill.lower())

        projects.append({
            "title": title,
            "technologies": technologies,
            "description": description or None,
        })
        if len(projects) >= 6:
            break

    return projects


def _fallback_parse(text: str) -> dict:
    joined = _normalize(text)
    sections = _split_sections(text)

    skills = sorted(set(re.findall(
        r"\b(Python|Java|JavaScript|TypeScript|React|Next\.js|FastAPI|Django|Flask|SQL|PostgreSQL|"
        r"MySQL|MongoDB|AWS|Azure|GCP|Docker|Kubernetes|Git|GitHub|Linux|Node\.js|HTML|CSS|"
        r"TailwindCSS|Tailwind|Bootstrap|C\+\+|C#|PHP|Ruby|Go|Rust|Kotlin|Swift|Figma|"
        r"VS Code|Cursor|Claude|ChatGPT|Copilot|Gemini|Postman|REST|REST APIs|OOP)\b",
        joined,
        flags=re.I,
    )))
    seen = set()
    normalized = []
    for raw in skills:
        key = raw.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(raw)

    def _normalize_url(raw: str | None) -> str | None:
        if not raw:
            return None
        raw = raw.strip().rstrip(").,;")
        if not raw.lower().startswith(("http://", "https://")):
            raw = "https://" + raw
        return raw

    linkedin = _normalize_url(_first_match(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9_\-/.%]+", joined))
    github = _normalize_url(_first_match(r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9_\-/.]+", joined))
    portfolio = _normalize_url(_first_match(r"https?://(?!(?:www\.)?(?:linkedin|github)\.com)[A-Za-z0-9_\-./?=&#%]+", joined))
    location = _detect_location(joined)
    university = _detect_university(joined)
    degree = _detect_degree(joined)
    experience_years = _detect_experience_years(joined)
    projects = _detect_projects(sections, normalized)

    # Prefer a graduation year close to the current year; fall back to the first plausible
    # four-digit year in the text. Use a non-capturing group so re.findall returns full years.
    all_years = [int(y) for y in re.findall(r"\b(?:19|20)\d{2}\b", joined)]
    plausible = [y for y in all_years if 1990 <= y <= 2035]
    # Pick the largest plausible year (often the expected-graduation year on student CVs)
    graduation_year = max(plausible) if plausible else None

    summary_parts: list[str] = []
    if degree and university:
        summary_parts.append(f"{degree} student at {university}")
    elif degree:
        summary_parts.append(f"{degree} student")
    elif university:
        summary_parts.append(f"Student at {university}")
    elif normalized:
        summary_parts.append(f"Candidate with experience in {', '.join(normalized[:5])}")
    else:
        summary_parts.append("Candidate profile extracted from uploaded resume")

    if projects:
        project_titles = ", ".join(p["title"] for p in projects[:3])
        summary_parts.append(f"built projects such as {project_titles}")
    elif normalized and (degree or university):
        summary_parts.append(f"skilled in {', '.join(normalized[:5])}")

    if location:
        summary_parts.append(f"based in {location}")

    summary = ". ".join(summary_parts).strip() + "."

    return {
        "summary": summary,
        "skills": normalized[:30],
        "projects": projects,
        "university": university,
        "degree": degree,
        "graduation_year": graduation_year,
        "experience_years": experience_years,
        "current_location": location,
        "linkedin_url": linkedin,
        "github_url": github,
        "portfolio_url": portfolio,
    }


def _fallback_report(profile: dict) -> dict:
    skills = profile.get("skills", []) or []
    return {
        "professional_summary": profile.get("summary")
        or "Early-career candidate building practical software skills.",
        "suggested_paths": ["Backend Developer", "Full-Stack Developer"],
        "skill_gaps": ["System design fundamentals", "Testing discipline"],
        "resume_suggestions": [
            "Quantify project outcomes.",
            (f"Highlight strongest skills first: {', '.join(skills[:5])}" if skills else "Add a focused skills section."),
        ],
    }


def parse_resume(text: str) -> dict:
    if not settings.openai_api_key:
        return _fallback_parse(text)

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            response_format={"type": "json_object"},
            temperature=0,
            messages=[
                {"role": "system", "content": RESUME_PROMPT},
                {"role": "user", "content": text[:12000]},
            ],
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        data.setdefault("summary", "")
        data.setdefault("skills", [])
        data.setdefault("projects", [])
        data.setdefault("university", None)
        data.setdefault("degree", None)
        data.setdefault("graduation_year", None)
        data.setdefault("experience_years", 0)
        data.setdefault("current_location", None)
        data.setdefault("linkedin_url", None)
        data.setdefault("github_url", None)
        data.setdefault("portfolio_url", None)
        return data
    except Exception:
        return _fallback_parse(text)


def generate_career_report(profile: dict) -> dict:
    if not settings.openai_api_key:
        return _fallback_report(profile)

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            response_format={"type": "json_object"},
            temperature=0.2,
            messages=[
                {"role": "system", "content": REPORT_PROMPT},
                {"role": "user", "content": json.dumps(profile)},
            ],
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        data.setdefault("professional_summary", "")
        data.setdefault("suggested_paths", [])
        data.setdefault("skill_gaps", [])
        data.setdefault("resume_suggestions", [])
        return data
    except Exception:
        return _fallback_report(profile)
