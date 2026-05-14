import { Resend } from "resend";
import { logger } from "../lib/logger";

type SendVerificationEmailArgs = {
  toEmail: string;
  code: string;
  purpose: "password-reset" | "first-login";
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function sendVerificationEmail({ toEmail, code, purpose }: SendVerificationEmailArgs): Promise<void> {
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("RESEND_FROM_EMAIL");

  const resend = new Resend(apiKey);

  const subject =
    purpose === "password-reset"
      ? "TrackHub: Password Reset Verification Code"
      : "TrackHub: First Login Verification Code";

  const message =
    purpose === "password-reset"
      ? "Use the code below to reset your password. This code will expire soon."
      : "Use the code below to complete your first-login password change. This code will expire soon.";

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'; color:#111827;">
      <p style="margin:0 0 12px 0;">${message}</p>
      <p style="margin:0 0 18px 0;">Your verification code is:</p>
      <div style="display:inline-block; padding:12px 18px; border:1px solid #111827; border-radius:10px; font-size:20px; font-weight:800; letter-spacing:2px;">
        ${code}
      </div>
      <p style="margin:18px 0 0 0; color:#6b7280; font-size:12px;">
        If you didn’t request this, you can ignore this email.
      </p>
    </div>
  `.trim();

  const result = await resend.emails.send({
    from,
    to: [toEmail],
    subject,
    html,
  });

  // Ensure we can verify in server logs that Resend actually attempted delivery.
  // (Avoid logging secrets; only log provider response metadata.)
  logger.info(
    { purpose, to: toEmail, id: (result as { id?: string }).id, status: (result as { status?: string }).status },
    "Resend send ok"
  );
}
