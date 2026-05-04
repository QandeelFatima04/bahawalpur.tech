import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "../../lib/email/mailer.js";
import {
  emailVerificationTemplate,
  passwordResetTemplate,
  meetingInvitationTemplate,
  passwordChangedTemplate,
  newLoginTemplate,
} from "../../lib/email/templates.js";

export const dynamic = "force-dynamic";

function getTemplate(type, baseUrl) {
  if (type === "verification") {
    return emailVerificationTemplate({
      verificationUrl: `${baseUrl}/verify-email?token=test-token-123`,
      expiresInMinutes: 30,
    });
  }

  if (type === "password-reset") {
    return passwordResetTemplate({
      resetUrl: `${baseUrl}/reset-password?token=test-token-123`,
      expiresInMinutes: 30,
    });
  }

  if (type === "meeting") {
    return meetingInvitationTemplate({
      meetingUrl: `${baseUrl}/meeting/test-meeting-id`,
      meetingTime: "Tomorrow at 3:00 PM",
    });
  }

  if (type === "password-changed") {
    return passwordChangedTemplate();
  }

  if (type === "new-login") {
    return newLoginTemplate({
      loginTime: new Date().toISOString(),
      ipAddress: "127.0.0.1",
    });
  }

  return emailVerificationTemplate({
    verificationUrl: `${baseUrl}/verify-email?token=test-token-123`,
    expiresInMinutes: 30,
  });
}

export async function GET(request) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.TEST_EMAIL_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const to = request.nextUrl.searchParams.get("to") || process.env.SMTP_USER;
  const type = request.nextUrl.searchParams.get("type") || "verification";
  const baseUrl = process.env.APP_BASE_URL || "https://bahawalpur.tech";

  try {
    const template = getTemplate(type, baseUrl);

    await sendTransactionalEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    return NextResponse.json({
      ok: true,
      type,
      to,
      message: "Transactional test email sent",
    });
  } catch (error) {
    console.error("Transactional email test failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
