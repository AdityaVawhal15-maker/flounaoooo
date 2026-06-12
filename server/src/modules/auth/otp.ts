import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/error.js";

const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_ACTIVE_SENDS = 3; // unexpired codes per target — blocks OTP spam

export async function createOtp(opts: {
  userId?: string;
  channel: "email" | "phone";
  target: string;
  purpose: "signup" | "login" | "reset";
}) {
  const active = await prisma.otpCode.count({
    where: {
      target: opts.target,
      purpose: opts.purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (active >= MAX_ACTIVE_SENDS) {
    throw new ApiError(429, "Too many codes requested. Try again in a few minutes.");
  }

  // crypto-random 6-digit code; never logged or stored in plain text
  const code = crypto.randomInt(100000, 1000000).toString();
  await prisma.otpCode.create({
    data: {
      userId: opts.userId,
      channel: opts.channel,
      target: opts.target,
      purpose: opts.purpose,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  return code;
}

export async function consumeOtp(opts: {
  target: string;
  purpose: "signup" | "login" | "reset";
  code: string;
}) {
  const candidates = await prisma.otpCode.findMany({
    where: {
      target: opts.target,
      purpose: opts.purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const candidate of candidates) {
    const ok = await bcrypt.compare(opts.code, candidate.codeHash);
    if (ok) {
      await prisma.otpCode.update({
        where: { id: candidate.id },
        data: { consumedAt: new Date() },
      });
      return true;
    }
    await prisma.otpCode.update({
      where: { id: candidate.id },
      data: { attempts: { increment: 1 } },
    });
  }
  return false;
}
