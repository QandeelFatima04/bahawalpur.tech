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


def send_email(
    to: str | None,
    subject: str,
    body_lines: Iterable[str],
    html_body: str | None = None,
) -> None:
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
    if html_body:
        msg.add_alternative(html_body, subtype="html")

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


def interview_reminder(
    *,
    student_email: str | None,
    company_email: str | None,
    student_name: str,
    company_name: str,
    job_title: str,
    interview_date,
    meeting_link: str,
    horizon: str,
) -> None:
    """Send a reminder email with the meeting link to BOTH parties.
    `horizon` is a human phrase like '24 hours' or '1 hour' that goes in the subject + body."""
    when = f"{interview_date:%A, %d %B %Y at %H:%M UTC}"
    send_email(
        student_email,
        subject=f"Reminder: interview with {company_name} in {horizon} — {job_title}",
        body_lines=[
            f"This is a reminder that your interview with {company_name} for the {job_title} role"
            f" is in {horizon}.",
            "",
            f"When: {when}",
            f"Join: {meeting_link}",
            "",
            "The Join meeting button is also available on your dashboard:",
            f"  {settings.app_web_base}/student",
            "",
            "— CareerBridge AI",
        ],
    )
    send_email(
        company_email,
        subject=f"Reminder: interview with {student_name} in {horizon} — {job_title}",
        body_lines=[
            f"This is a reminder that your interview with {student_name} for the {job_title} role"
            f" is in {horizon}.",
            "",
            f"When: {when}",
            f"Join: {meeting_link}",
            "",
            "The Join meeting button is also available on your dashboard:",
            f"  {settings.app_web_base}/company",
            "",
            "— CareerBridge AI",
        ],
    )


def verify_email(to: str | None, token: str) -> None:
    """Send the email-verification link. Token TTL is enforced server-side (1 hour)."""
    link = f"{settings.app_web_base}/verify-email?token={token}"
    html_body = f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
        <h1 style="font-size:22px;margin:0 0 12px;">Verify your CareerBridge AI account</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
          Welcome to CareerBridge AI. Confirm your email address by clicking the button below
          within <strong>1 hour</strong>.
        </p>
        <p style="margin:0 0 20px;">
          <a href="{link}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
                    padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
            Verify Email
          </a>
        </p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size:13px;word-break:break-all;margin:0 0 24px;">
          <a href="{link}" style="color:#111827;">{link}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
        <p style="font-size:12px;color:#6b7280;margin:0;">
          If you did not create this account, you can safely ignore this email.
        </p>
      </div>
    </div>
  </body>
</html>"""
    send_email(
        to,
        subject="Verify your CareerBridge AI account",
        body_lines=[
            "Welcome to CareerBridge AI.",
            "",
            "Confirm this is your email address by opening the link below within 1 hour:",
            "",
            link,
            "",
            "If you did not sign up, you can safely ignore this message.",
            "",
            "— CareerBridge AI",
        ],
        html_body=html_body,
    )


def forgot_password(to: str | None, token: str) -> None:
    """Send a password-reset link. Token TTL is enforced server-side (30 minutes)."""
    link = f"{settings.app_web_base}/reset-password?token={token}"
    html_body = f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
        <h1 style="font-size:22px;margin:0 0 12px;">Reset your CareerBridge AI password</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
          We received a request to reset the password for your account. Click the button below
          within <strong>30 minutes</strong> to set a new password.
        </p>
        <p style="margin:0 0 20px;">
          <a href="{link}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
                    padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size:13px;word-break:break-all;margin:0 0 24px;">
          <a href="{link}" style="color:#111827;">{link}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
        <p style="font-size:12px;color:#6b7280;margin:0;">
          If you did not request a password reset, you can safely ignore this email.
          Your password will not change.
        </p>
      </div>
    </div>
  </body>
</html>"""
    send_email(
        to,
        subject="Reset your CareerBridge AI password",
        body_lines=[
            "You requested a password reset for your CareerBridge AI account.",
            "",
            "Open the link below within 30 minutes to set a new password:",
            "",
            link,
            "",
            "If you did not request this, you can safely ignore this email.",
            "",
            "— CareerBridge AI",
        ],
        html_body=html_body,
    )
