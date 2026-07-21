import { env } from "../config/env.js";

// Branded transactional emails. Email clients (Gmail, Outlook) strip <style>
// blocks and modern CSS, so everything is table-layout with inline styles —
// the same Radiues tokens as the app: cream #fff9f6, ink #3d1c00,
// accent #e8651a, cocoa #8b5e3c, beige #f0e6de.

const COLORS = {
  cream: "#fff9f6",
  ink: "#3d1c00",
  accent: "#e8651a",
  cocoa: "#8b5e3c",
  beige: "#f0e6de",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Shared shell: cream page, white card, wordmark header, muted footer.
function layout(bodyHtml: string, preheader: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:${COLORS.cream};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.cream};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding:0 4px 16px;">
  <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:${COLORS.ink};">Radiues</span>
</td></tr>
<tr><td style="background-color:#ffffff;border:1px solid ${COLORS.beige};border-radius:16px;padding:28px;">
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 4px 0;">
  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:${COLORS.cocoa};">
    Radiues · Algorithec Pvt Ltd<br>
    You received this email because of activity on your Radiues account.
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export type OtpPurpose = "signup" | "step_up" | "reset";

const OTP_COPY: Record<OtpPurpose, { heading: string; lead: string }> = {
  signup: {
    heading: "Verify your email",
    lead: "Welcome to Radiues! Enter this code to activate your account:",
  },
  step_up: {
    heading: "Confirm it's you",
    lead: "Use this code to finish signing in to Radiues:",
  },
  reset: {
    heading: "Reset your password",
    lead: "Use this code to set a new Radiues password:",
  },
};

export function otpEmail(code: string, purpose: OtpPurpose) {
  const copy = OTP_COPY[purpose];
  const html = layout(
    `<h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:${COLORS.ink};">${copy.heading}</h1>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${COLORS.cocoa};">${copy.lead}</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="background-color:${COLORS.cream};border:1px dashed ${COLORS.accent};border-radius:12px;padding:18px;">
  <span style="font-family:Courier New,monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:${COLORS.ink};">${escapeHtml(code)}</span>
</td></tr>
</table>
<p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${COLORS.cocoa};">
  This code expires in <strong>10 minutes</strong>. If you didn't request it, you can safely ignore this email — your account stays untouched.
</p>`,
    `${code} is your Radiues verification code`,
  );
  const text = `${copy.heading}\n\n${copy.lead} ${code}\n\nIt expires in 10 minutes. If you didn't request this, ignore this email.`;
  return { subject: `${code} is your Radiues verification code`, html, text };
}

export function welcomeEmail(name: string) {
  const safeName = escapeHtml(name || "there");
  const html = layout(
    `<h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:${COLORS.ink};">You're in, ${safeName} 🎉</h1>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${COLORS.cocoa};">
  Radiues compares food and ride prices for you and always picks the best deal — you just order.
</p>
<p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${COLORS.cocoa};">
  Try asking the assistant: <em>"order a biryani"</em> or <em>"get me a cab to the airport"</em>.
</p>
<table role="presentation" cellpadding="0" cellspacing="0">
<tr><td style="background-color:${COLORS.accent};border-radius:999px;">
  <a href="${env.WEB_ORIGIN}/chat" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Start saving</a>
</td></tr>
</table>`,
    "Your Radiues account is ready",
  );
  const text = `You're in, ${name || "there"}!\n\nRadiues compares food and ride prices and always picks the best deal.\n\nStart here: ${env.WEB_ORIGIN}/chat`;
  return { subject: "Welcome to Radiues — your account is ready", html, text };
}

export function receiptEmail(order: {
  id: string;
  title: string;
  domain: string;
  amount: number;
  savedPaise: number;
}) {
  const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  const kind = order.domain === "food" ? "Food order" : "Ride";
  const savedRow =
    order.savedPaise > 0
      ? `<tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a7f37;">You saved</td>
<td align="right" style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1a7f37;">${rupees(order.savedPaise)}</td></tr>`
      : "";
  const html = layout(
    `<h1 style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:${COLORS.ink};">Payment received ✓</h1>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.cocoa};">${kind} · confirmed and underway</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${COLORS.beige};">
<tr><td style="padding:12px 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.cocoa};">${escapeHtml(order.title)}</td>
<td align="right" style="padding:12px 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.ink};">${rupees(order.amount)}</td></tr>
${savedRow}
<tr><td style="padding:12px 0;border-top:1px solid ${COLORS.beige};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${COLORS.ink};">Total paid</td>
<td align="right" style="padding:12px 0;border-top:1px solid ${COLORS.beige};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${COLORS.ink};">${rupees(order.amount)}</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr><td style="background-color:${COLORS.accent};border-radius:999px;">
  <a href="${env.WEB_ORIGIN}/orders/${order.id}" style="display:inline-block;padding:11px 26px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#ffffff;text-decoration:none;">Track your order</a>
</td></tr>
</table>
<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${COLORS.cocoa};">Receipt reference: ${escapeHtml(order.id)} · full invoice available in the app.</p>`,
    `Payment received — ${order.title}`,
  );
  const text = `Payment received ✓\n\n${kind}: ${order.title}\nTotal paid: ${rupees(order.amount)}${order.savedPaise > 0 ? `\nYou saved: ${rupees(order.savedPaise)}` : ""}\n\nTrack: ${env.WEB_ORIGIN}/orders/${order.id}`;
  return { subject: `Payment received — ${order.title}`, html, text };
}
