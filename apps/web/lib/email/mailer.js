import nodemailer from "nodemailer";

function getFromAddress() {
  const name = process.env.EMAIL_FROM_NAME || "Bahawalpur Tech";
  const address =
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.SMTP_USER ||
    "no-reply@bahawalpur.tech";

  return `"${name}" <${address}>`;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "mail.bahawalpur.tech",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // port 587 uses STARTTLS, not implicit TLS
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}) {
  if (!to) {
    throw new Error("Missing recipient email");
  }

  if (!subject) {
    throw new Error("Missing email subject");
  }

  if (!html || !text) {
    throw new Error("Transactional emails must include both HTML and plain text");
  }

  const transporter = getTransporter();

  const fromAddress = getFromAddress();
  const supportEmail = process.env.SUPPORT_EMAIL || "support@bahawalpur.tech";
  const bounceEmail =
    process.env.BOUNCE_EMAIL ||
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.SMTP_USER ||
    "no-reply@bahawalpur.tech";

  return transporter.sendMail({
    from: fromAddress,

    // User replies go here
    replyTo: replyTo || supportEmail,

    // This controls SMTP envelope sender / Return-Path behavior
    envelope: {
      from: bounceEmail,
      to,
    },

    to,
    subject,
    text,
    html,
  });
}
