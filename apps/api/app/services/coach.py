from __future__ import annotations

from typing import Generator

from openai import OpenAI

from ..config import get_settings

settings = get_settings()

_COACH_SYSTEM_TEMPLATE = """\
You are Aisha, a warm, practical career coach for fresh software engineering graduates in \
Bahawalpur, Pakistan. You know the local job market well — Bahria Town tech companies, \
remote-first Pakistan startups, and freelancing platforms like Upwork and Fiverr that \
Bahawalpur grads use successfully. You are honest about skill gaps but always encouraging. \
Keep replies concise and conversational — especially in voice mode (short sentences, no \
markdown bullet points, no asterisks). Address the student by their first name.

=== Student Profile ===
Name: {name}
University: {university}
Degree: {degree}
Graduation Year: {graduation_year}
Experience: {experience_years} year(s)
Location: {location}
Skills: {skills}
Projects:
{projects}

=== Career Analysis ===
Professional Summary: {professional_summary}
Suggested Career Paths: {suggested_paths}
Skill Gaps: {skill_gaps}
Resume Suggestions: {resume_suggestions}
"""


def build_system_prompt(
    *,
    name: str,
    university: str | None,
    degree: str | None,
    graduation_year: int | None,
    experience_years: float,
    location: str | None,
    skills: list[str],
    projects: list[dict],
    professional_summary: str,
    suggested_paths: list[str],
    skill_gaps: list[str],
    resume_suggestions: list[str],
) -> str:
    project_lines = "\n".join(
        f"  - {p.get('title', 'Untitled')}: {', '.join(p.get('technologies', []))}"
        for p in projects
    ) or "  (none listed)"

    return _COACH_SYSTEM_TEMPLATE.format(
        name=name or "Student",
        university=university or "N/A",
        degree=degree or "N/A",
        graduation_year=graduation_year or "N/A",
        experience_years=experience_years,
        location=location or "Bahawalpur, Pakistan",
        skills=", ".join(skills) if skills else "not listed yet",
        projects=project_lines,
        professional_summary=professional_summary or "Not available yet.",
        suggested_paths=", ".join(suggested_paths) if suggested_paths else "Not available yet.",
        skill_gaps=", ".join(skill_gaps) if skill_gaps else "None identified yet.",
        resume_suggestions=", ".join(resume_suggestions) if resume_suggestions else "None yet.",
    )


def _openrouter_client() -> OpenAI:
    """Client for chat completions. Routes to OpenRouter."""
    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY is required for the coach feature")
    return OpenAI(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
    )


def _openai_client() -> OpenAI:
    """Client for STT + TTS. Hits api.openai.com directly because OpenRouter
    does not implement the /audio/transcriptions or /audio/speech endpoints."""
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for voice (STT/TTS) features")
    return OpenAI(api_key=settings.openai_api_key)


def stream_reply(messages: list[dict], system_prompt: str) -> Generator[str, None, None]:
    """Yield text chunks from Gemini Flash via OpenRouter."""
    client = _openrouter_client()
    stream = client.chat.completions.create(
        model=settings.openrouter_chat_model,
        messages=[{"role": "system", "content": system_prompt}] + messages,
        stream=True,
        temperature=0.7,
        max_tokens=600,
        extra_headers={
            "HTTP-Referer": "https://careerbridge.app",
            "X-Title": "CareerBridge Coach",
        },
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def transcribe_audio(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Return transcribed text from Whisper (OpenAI direct)."""
    client = _openai_client()
    transcript = client.audio.transcriptions.create(
        model=settings.openai_stt_model,
        file=(filename, file_bytes, content_type),
        response_format="text",
    )
    # OpenAI returns the transcript as the string directly when response_format="text"
    return transcript if isinstance(transcript, str) else transcript.text


def synthesize_speech(text: str) -> bytes:
    """Return raw MP3 bytes from gpt-4o-mini-tts (OpenAI direct)."""
    client = _openai_client()
    response = client.audio.speech.create(
        model=settings.openai_tts_model,
        voice="alloy",
        input=text,
        response_format="mp3",
    )
    return response.content
