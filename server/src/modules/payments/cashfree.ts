import crypto from "node:crypto";
import { env } from "../../config/env.js";

const BASE_URL =
  env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const API_VERSION = "2023-08-01";

export const cashfreeConfigured = Boolean(
  env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY,
);

export async function createCashfreeOrder(opts: {
  orderId: string;
  amountPaise: number;
  customerId: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
}) {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": env.CASHFREE_APP_ID!,
      "x-client-secret": env.CASHFREE_SECRET_KEY!,
    },
    body: JSON.stringify({
      order_id: opts.orderId,
      order_amount: (opts.amountPaise / 100).toFixed(2),
      order_currency: "INR",
      customer_details: {
        customer_id: opts.customerId,
        customer_email: opts.customerEmail,
        customer_phone: opts.customerPhone || "9999999999",
      },
      order_meta: { return_url: opts.returnUrl },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cashfree order create failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return (await res.json()) as {
    cf_order_id: string;
    payment_session_id: string;
    order_status: string;
  };
}

// Webhook authenticity: HMAC-SHA256(timestamp + rawBody, secret) must match
// the signature header. Requests that fail this are discarded.
export function verifyCashfreeWebhook(
  rawBody: string,
  signature: string,
  timestamp: string,
): boolean {
  if (!env.CASHFREE_SECRET_KEY) return false;
  const expected = crypto
    .createHmac("sha256", env.CASHFREE_SECRET_KEY)
    .update(timestamp + rawBody)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
