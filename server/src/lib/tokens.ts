import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Response } from "express";
import { env, isProd } from "../config/env.js";
import { prisma } from "./prisma.js";
import type { Role } from "./rbac.js";

// `step` marks a session that has cleared operator step-up (2FA). Ordinary user
// sessions never set it; console routes require it so a leaked operator password
// alone — without the email OTP — cannot reach the back-office.
export type AccessPayload = { sub: string; role: Role; step?: boolean };

export function signAccessToken(
  userId: string,
  role: Role = "user",
  stepUp = false,
) {
  return jwt.sign(
    { sub: userId, role, ...(stepUp ? { step: true } : {}) } satisfies AccessPayload,
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
    },
  );
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  } catch {
    return null;
  }
}

// Refresh tokens are opaque random strings stored hashed — a DB leak
// exposes nothing usable, and individual sessions can be revoked.
export async function issueRefreshToken(userId: string, stepUp = false) {
  const raw = crypto.randomBytes(48).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      stepUp,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  });
  return raw;
}

export async function rotateRefreshToken(raw: string) {
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
  // Carry the step-up status onto the rotated token so a verified operator
  // session keeps its 2FA standing across refreshes.
  const next = await issueRefreshToken(existing.userId, existing.stepUp);
  return { userId: existing.userId, token: next, stepUp: existing.stepUp };
}

export async function revokeRefreshToken(raw: string) {
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const base = {
    httpOnly: true,
    secure: isProd,
  };
  // Access token: lax so top-level navigation carries it.
  res.cookie("access_token", accessToken, {
    ...base,
    sameSite: "lax" as const,
    maxAge: 15 * 60_000,
  });
  // Refresh token: strict + scoped to /api/auth — it's only ever sent to the
  // refresh/logout endpoints, so the tighter policy adds CSRF defense for free.
  res.cookie("refresh_token", refreshToken, {
    ...base,
    sameSite: "strict" as const,
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token", { path: "/api/auth" });
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
