const BRAND_NAME = "Bahawalpur Tech";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validateBahawalpurUrl(url) {
  const parsed = new URL(url);

  const allowedHosts = ["bahawalpur.tech", "www.bahawalpur.tech"];

  if (parsed.protocol !== "https:") {
    throw new Error(`Email links must use HTTPS: ${url}`);
  }

  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error(`Email links must stay on bahawalpur.tech: ${url}`);
  }

  return parsed.toString();
}

function layout({ title, body }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
        <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;">
          ${escapeHtml(title)}
        </h1>

        <div style="font-size:15px;line-height:1.6;">
          ${body}
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

        <p style="font-size:12px;line-height:1.5;color:#6b7280;margin:0;">
          This is a transactional email from ${BRAND_NAME}. If you did not request this, you can ignore this email.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

export function emailVerificationTemplate({ verificationUrl, expiresInMinutes = 30 }) {
  const safeUrl = validateBahawalpurUrl(verificationUrl);

  return {
    subject: "Verify your Bahawalpur Tech account",
    text:
`Verify your Bahawalpur Tech account

Your verification link expires in ${expiresInMinutes} minutes:
${safeUrl}

If you did not create this account, ignore this email.`,

    html: layout({
      title: "Verify your Bahawalpur Tech account",
      body: `
        <p>Your verification link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
        <p>
          <a href="${safeUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;">
            Verify email
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break:break-all;"><a href="${safeUrl}">${safeUrl}</a></p>
        <p>If you did not create this account, ignore this email.</p>
      `,
    }),
  };
}

export function passwordResetTemplate({ resetUrl, expiresInMinutes = 30 }) {
  const safeUrl = validateBahawalpurUrl(resetUrl);

  return {
    subject: "Reset your Bahawalpur Tech password",
    text:
`Reset your Bahawalpur Tech password

Your password reset link expires in ${expiresInMinutes} minutes:
${safeUrl}

If you did not request a password reset, ignore this email.`,

    html: layout({
      title: "Reset your Bahawalpur Tech password",
      body: `
        <p>Your password reset link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
        <p>
          <a href="${safeUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;">
            Reset password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break:break-all;"><a href="${safeUrl}">${safeUrl}</a></p>
        <p>If you did not request a password reset, ignore this email.</p>
      `,
    }),
  };
}

export function meetingInvitationTemplate({ meetingUrl, meetingTime }) {
  const safeUrl = validateBahawalpurUrl(meetingUrl);
  const safeTime = escapeHtml(meetingTime || "the scheduled time");

  return {
    subject: "Your Bahawalpur Tech meeting link",
    text:
`Your Bahawalpur Tech meeting link

Meeting time: ${safeTime}
Meeting link:
${safeUrl}`,

    html: layout({
      title: "Your Bahawalpur Tech meeting link",
      body: `
        <p>Your meeting is scheduled for:</p>
        <p><strong>${safeTime}</strong></p>
        <p>
          <a href="${safeUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;">
            Join meeting
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break:break-all;"><a href="${safeUrl}">${safeUrl}</a></p>
      `,
    }),
  };
}

export function passwordChangedTemplate() {
  return {
    subject: "Your Bahawalpur Tech password was changed",
    text:
`Your Bahawalpur Tech password was changed

This is a security alert to confirm that your password was changed.

If this was you, no action is needed.

If this was not you, contact support immediately.`,

    html: layout({
      title: "Your Bahawalpur Tech password was changed",
      body: `
        <p>This is a security alert to confirm that your password was changed.</p>
        <p>If this was you, no action is needed.</p>
        <p>If this was not you, contact support immediately.</p>
      `,
    }),
  };
}

export function newLoginTemplate({ loginTime, ipAddress }) {
  const safeLoginTime = escapeHtml(loginTime || "Unknown time");
  const safeIpAddress = escapeHtml(ipAddress || "Unknown IP");

  return {
    subject: "New login to your Bahawalpur Tech account",
    text:
`New login to your Bahawalpur Tech account

Login time: ${safeLoginTime}
IP address: ${safeIpAddress}

If this was you, no action is needed.

If this was not you, reset your password immediately.`,

    html: layout({
      title: "New login to your Bahawalpur Tech account",
      body: `
        <p>We noticed a new login to your account.</p>
        <p><strong>Login time:</strong> ${safeLoginTime}</p>
        <p><strong>IP address:</strong> ${safeIpAddress}</p>
        <p>If this was you, no action is needed.</p>
        <p>If this was not you, reset your password immediately.</p>
      `,
    }),
  };
}
