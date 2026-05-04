"""Lightweight email dispatcher.

In dev (no SMTP_HOST configured) we log the message instead of sending — so the rest
of the app can pretend mail works without needing a live SMTP provider. In production,
set SMTP_HOST / SMTP_USER / SMTP_PASSWORD and mails go out via smtplib.

Every call is wrapped in a broad try/except so a mail failure never breaks the
user-facing action (interview requests, hires, approvals).
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from typing import Iterable

from ..config import get_settings

logger = logging.getLogger("careerbridge.email")
settings = get_settings()


def _build_body(lines: Iterable[str]) -> str:
    return "\n".join(lines)


def send_email(to: str | None, subject: str, body_lines: Iterable[str]) -> None:
    if not to:
        logger.debug("send_email skipped: no recipient")
        return

    body = _build_body(body_lines)

    if not settings.smtp_host:
        logger.info(
            "[email/dev] to=%s subject=%s\n%s\n--- end email ---",
            to,
            subject,
            body,
        )
        return

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password or "")
            server.send_message(msg)
        logger.info("email sent to=%s subject=%s", to, subject)
    except Exception as exc:  # noqa: BLE001
        logger.warning("email dispatch failed to=%s subject=%s error=%s", to, subject, exc)


def interview_requested(student_email: str | None, company_name: str, job_title: str, interview_date) -> None:
    send_email(
        student_email,
        subject=f"{company_name} invited you to interview for {job_title}",
        body_lines=[
            f"Good news — {company_name} has sent you an interview request for the {job_title} role.",
            "",
            f"Scheduled: {interview_date:%A, %d %B %Y at %H:%M UTC}",
            "",
            f"Open {settings.app_web_base}/student and head to the Interviews tab to Accept or Reject.",
            "",
            "— CareerBridge AI",
        ],
    )


def interview_response(company_email: str | None, student_id: int, job_title: str, accepted: bool) -> None:
    verb = "accepted" if accepted else "declined"
    send_email(
        company_email,
        subject=f"Candidate #{student_id} {verb} your interview request for {job_title}",
        body_lines=[
            f"Candidate #{student_id} has {verb} your interview request for the {job_title} role.",
            "",
            f"See the Interviews tab: {settings.app_web_base}/company",
            "",
            "— CareerBridge AI",
        ],
    )


def interview_scheduled(
    *,
    student_email: str | None,
    company_email: str | None,
    company_name: str,
    student_name: str,
    job_title: str,
    interview_date,
    meeting_link: str,
) -> None:
    """Sent to BOTH parties once the student accepts. Carries the meeting link."""
    when = f"{interview_date:%A, %d %B %Y at %H:%M UTC}"
    send_email(
        student_email,
        subject=f"Interview confirmed — {company_name} · {job_title}",
        body_lines=[
            f"You're scheduled to interview with {company_name} for the {job_title} role.",
            "",
            f"When: {when}",
            f"Join: {meeting_link}",
            "",
            "The Join meeting button becomes active on your dashboard ~15 minutes before the scheduled time.",
            "",
            f"Dashboard: {settings.app_web_base}/student",
            "",
            "— CareerBridge AI",
        ],
    )
    send_email(
        company_email,
        subject=f"Interview confirmed — {student_name} · {job_title}",
        body_lines=[
            f"{student_name} accepted your interview request for the {job_title} role.",
            "",
            f"When: {when}",
            f"Join: {meeting_link}",
            "",
            "The Join meeting button becomes active on your dashboard ~15 minutes before the scheduled time.",
            "",
            f"Dashboard: {settings.app_web_base}/company",
            "",
            "— CareerBridge AI",
        ],
    )


def hire_decision(student_email: str | None, company_name: str, job_title: str, hired: bool) -> None:
    if hired:
        send_email(
            student_email,
            subject=f"🎉 You've been hired at {company_name}",
            body_lines=[
                f"Congratulations — {company_name} has marked you as hired for the {job_title} role.",
                "",
                f"Expect next steps directly from {company_name}.",
                "",
                "— CareerBridge AI",
            ],
        )
    else:
        send_email(
            student_email,
            subject=f"Interview outcome for {job_title} at {company_name}",
            body_lines=[
                f"Thanks for interviewing with {company_name} for the {job_title} role.",
                "",
                "They've decided not to move forward this time. Keep applying — more roles are listed"
                " on your dashboard.",
                "",
                f"Visit {settings.app_web_base}/student/",
                "",
                "— CareerBridge AI",
            ],
        )


def company_approved(company_email: str | None, company_name: str) -> None:
    send_email(
        company_email,
        subject=f"{company_name} is verified on CareerBridge AI",
        body_lines=[
            f"Your company profile '{company_name}' has been approved.",
            "",
            f"You can now post roles and review applicants: {settings.app_web_base}/company",
            "",
            "— CareerBridge AI",
        ],
    )
