import nodemailer from "nodemailer";
import { env } from "../config/env.js";

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
      })
    : null;

// Test hook: under NODE_ENV=test, codes are captured here instead of sent.
export const otpOutbox: Array<{ to: string; code: string }> = [];

export async function sendOtpEmail(to: string, code: string) {
  if (env.NODE_ENV === "test") {
    otpOutbox.push({ to, code });
    return;
  }
  if (!transport) {
    // Dev mode: no SMTP configured — surface the code in the server console.
    console.log(`[mailer] OTP for ${to}: ${code}`);
    return;
  }
  await transport.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: `${code} is your Radiues verification code`,
    text: `Your Radiues verification code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
  });
}
