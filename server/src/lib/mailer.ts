import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { otpEmail, welcomeEmail, receiptEmail, type OtpPurpose } from "./emailTemplates.js";

const transport =
  env.SMTP_HOST && env.SMTP_PORT
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
        // Bounded waits: without these nodemailer can hang for minutes on a
        // sick provider, stalling the notification outbox behind it. A timeout
        // surfaces as a send error, so the row simply retries.
        // Kept short because a person is waiting on the other side of some of
        // these. A blocked outbound port — which is the default on several
        // hosts — fails by timing out rather than refusing, so a generous
        // timeout turns a misconfiguration into a twelve second stall on the
        // sign-up button before the error even appears.
        connectionTimeout: 5_000,
        greetingTimeout: 5_000,
        socketTimeout: 10_000,
      })
    : null;

// Test hook: under NODE_ENV=test, codes are captured here instead of sent.
export const otpOutbox: Array<{ to: string; code: string }> = [];

export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: OtpPurpose = "signup",
) {
  if (env.NODE_ENV === "test") {
    otpOutbox.push({ to, code });
    return;
  }
  if (!transport) {
    // Dev mode: no SMTP configured — surface the code in the server console.
    console.log(`[mailer] OTP for ${to}: ${code}`);
    return;
  }
  const mail = otpEmail(code, purpose);
  await transport.sendMail({ from: env.MAIL_FROM, to, ...mail });
}

// Non-OTP mail is best-effort: auth and payment flows must never fail because
// an email couldn't be sent, so callers fire-and-forget and errors only log.

export async function sendWelcomeEmail(to: string, name: string) {
  if (env.NODE_ENV === "test" || !transport) return;
  try {
    const mail = welcomeEmail(name);
    await transport.sendMail({ from: env.MAIL_FROM, to, ...mail });
  } catch (err) {
    console.error(`[mailer] welcome email to ${to} failed:`, err);
  }
}

// Used by the notification outbox — the worker builds the mail from its
// registry and this just puts it on the wire. Test env is a no-op (the outbox
// records delivery itself for assertions).
export async function sendPrebuiltEmail(
  to: string,
  mail: { subject: string; html: string; text: string },
) {
  if (env.NODE_ENV === "test") return;
  if (!transport) {
    console.log(`[mailer] (no SMTP) would send "${mail.subject}" to ${to}`);
    return;
  }
  await transport.sendMail({ from: env.MAIL_FROM, to, ...mail });
}

export async function sendReceiptEmail(
  to: string,
  order: { id: string; title: string; domain: string; amount: number; savedPaise: number },
) {
  if (env.NODE_ENV === "test" || !transport) return;
  try {
    const mail = receiptEmail(order);
    await transport.sendMail({ from: env.MAIL_FROM, to, ...mail });
  } catch (err) {
    console.error(`[mailer] receipt email to ${to} failed:`, err);
  }
}
