from __future__ import annotations

import json

from openai import OpenAI

from ..config import get_settings
from .openai_logger import log_openai_call

settings = get_settings()


RESUME_PROMPT = """You are an expert resume parser. The attached file is a candidate resume. Read it
(including any embedded images or scanned pages) and extract a structured JSON profile.

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
  "phone": string|null,
  "email": string|null,
  "address": string|null,
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
- Use just the city, e.g. "Bahawalpur, Pakistan" or "Lahore". Do NOT include street addresses or
  postal codes here.

Rules for contact fields:
- `phone`: full phone number as written in the resume (keep country code and formatting). null if
  none.
- `email`: contact email address from the resume. null if none.
- `address`: full street/postal address line if the resume lists one (e.g. "House 12, Street 4,
  Model Town, Lahore"). null if only a city is given (use `current_location` for the city).

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


# Hand-written templates so the job-description feature still works when OPENAI_API_KEY is unset
# or the API call fails. (Resume parsing has no fallback — it requires the LLM.)
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
    role = (role_name or "").strip()
    role_lower = role.lower()

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
    """Return {ok, used_fallback, draft, error, tokens_used}. Never raises."""
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
    request_log = {
        "model": "gpt-4.1-mini",
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "messages": [
            {"role": "system", "content": JOB_DESCRIPTION_PROMPT},
            {"role": "user", "content": user_payload},
        ],
    }
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
        log_openai_call("generate_job_description", request_log, raw, tokens=tokens)

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
        log_openai_call("generate_job_description", request_log, None, error=str(exc))
        return {
            "ok": True,
            "used_fallback": True,
            "draft": _fallback_job_description(role_name, seniority_hint),
            "error": str(exc)[:500],
            "tokens_used": None,
        }


def parse_resume(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """Upload the resume file directly to OpenAI and parse it via the Responses API.

    Handles flat/scanned PDFs natively (the model reads the embedded images). Raises
    RuntimeError if OPENAI_API_KEY is not set; lets any OpenAI error propagate so the caller
    surfaces it as a failed parse job.
    """
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY required for resume parsing")

    client = OpenAI(api_key=settings.openai_api_key)
    uploaded = client.files.create(
        file=(filename or "resume.pdf", file_bytes, content_type or "application/octet-stream"),
        purpose="user_data",
    )
    file_id = uploaded.id
    request_log = {
        "model": "gpt-4.1-mini",
        "file_id": file_id,
        "filename": filename,
        "content_type": content_type,
        "size_bytes": len(file_bytes),
        "prompt": RESUME_PROMPT,
    }
    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_file", "file_id": file_id},
                        {"type": "input_text", "text": RESUME_PROMPT},
                    ],
                }
            ],
        )
        raw = getattr(response, "output_text", None) or ""
        tokens = getattr(getattr(response, "usage", None), "total_tokens", None)
        log_openai_call("parse_resume", request_log, raw, tokens=tokens)

        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
        data = json.loads(cleaned or "{}")

        data.setdefault("summary", "")
        data.setdefault("skills", [])
        data.setdefault("projects", [])
        data.setdefault("university", None)
        data.setdefault("degree", None)
        data.setdefault("graduation_year", None)
        data.setdefault("experience_years", 0)
        data.setdefault("current_location", None)
        data.setdefault("phone", None)
        data.setdefault("email", None)
        data.setdefault("address", None)
        data.setdefault("linkedin_url", None)
        data.setdefault("github_url", None)
        data.setdefault("portfolio_url", None)
        return data
    except Exception as exc:
        log_openai_call("parse_resume", request_log, None, error=str(exc))
        raise
    finally:
        try:
            client.files.delete(file_id)
        except Exception:
            pass


def generate_career_report(profile: dict) -> dict:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY required for career report")

    request_log = {
        "model": "gpt-4.1-mini",
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": REPORT_PROMPT},
            {"role": "user", "content": json.dumps(profile)},
        ],
    }
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
        tokens = getattr(getattr(response, "usage", None), "total_tokens", None)
        log_openai_call("generate_career_report", request_log, raw, tokens=tokens)
        data = json.loads(raw)
        data.setdefault("professional_summary", "")
        data.setdefault("suggested_paths", [])
        data.setdefault("skill_gaps", [])
        data.setdefault("resume_suggestions", [])
        return data
    except Exception as exc:
        log_openai_call("generate_career_report", request_log, None, error=str(exc))
        raise
