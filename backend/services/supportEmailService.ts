import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

type SupportAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

type SendSupportEmailArgs = {
  fullName: string;
  email: string;
  department?: string;
  subject: string;
  category: string;
  message: string;
  submittedAt: string;
  ticketId: string;
  attachment?: SupportAttachment;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getSupportTransporter(): nodemailer.Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: requireEnv("SUPPORT_EMAIL"),
      pass: requireEnv("SUPPORT_EMAIL_PASSWORD"),
    },
  });

  return cachedTransporter;
}

export async function sendSupportEmail(args: SendSupportEmailArgs): Promise<{ messageId?: string }> {
  const supportEmail = requireEnv("SUPPORT_EMAIL");
  const transporter = getSupportTransporter();

  const text = [
    "New Support Concern Submitted",
    "",
    `Ticket ID: ${args.ticketId}`,
    `Name: ${args.fullName}`,
    `Email: ${args.email}`,
    `Department: ${args.department?.trim() || "Not provided"}`,
    `Category: ${args.category}`,
    `Subject: ${args.subject}`,
    "",
    "Message:",
    args.message,
    "",
    "Submitted At:",
    args.submittedAt,
  ].join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a;">
      <h2 style="margin: 0 0 16px; font-size: 20px;">New Support Concern Submitted</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
        <tr><td style="padding: 6px 0; font-weight: 600;">Ticket ID:</td><td style="padding: 6px 0;">${escapeHtml(args.ticketId)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Name:</td><td style="padding: 6px 0;">${escapeHtml(args.fullName)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td style="padding: 6px 0;">${escapeHtml(args.email)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Department:</td><td style="padding: 6px 0;">${escapeHtml(args.department?.trim() || "Not provided")}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Category:</td><td style="padding: 6px 0;">${escapeHtml(args.category)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Subject:</td><td style="padding: 6px 0;">${escapeHtml(args.subject)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Submitted At:</td><td style="padding: 6px 0;">${escapeHtml(args.submittedAt)}</td></tr>
      </table>
      <div style="margin-top: 20px;">
        <p style="margin: 0 0 8px; font-weight: 600;">Message:</p>
        <div style="white-space: pre-wrap; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; background: #f8fafc;">
          ${escapeHtml(args.message)}
        </div>
      </div>
    </div>
  `.trim();

  const result = await transporter.sendMail({
    from: `"TrackHub Support" <${supportEmail}>`,
    to: supportEmail,
    replyTo: args.email,
    subject: `[TrackHub Support] ${args.category} - ${args.subject}`,
    text,
    html,
    attachments: args.attachment
      ? [
          {
            filename: args.attachment.filename,
            content: args.attachment.content,
            contentType: args.attachment.contentType,
          },
        ]
      : [],
  });

  logger.info(
    {
      to: supportEmail,
      replyTo: args.email,
      ticketId: args.ticketId,
      messageId: result.messageId,
    },
    "Support email sent"
  );

  return { messageId: result.messageId };
}
