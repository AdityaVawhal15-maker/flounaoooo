// API key management for MSME / developer-partner integrations. The raw secret
// is generated, shown to the operator EXACTLY ONCE, and only its SHA-256 hash is
// stored — a DB leak exposes nothing usable. `prefix` is a non-secret label kept
// for display and fast lookup.

import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function listApiKeys() {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      client: true,
      prefix: true,
      scope: true,
      lastUsedAt: true,
      callCount: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  return keys.map((k) => ({
    ...k,
    revoked: Boolean(k.revokedAt),
    expired: Boolean(k.expiresAt && k.expiresAt < new Date()),
  }));
}

// Creates a key and returns the RAW secret once. Caller must surface it to the
// operator immediately; it can never be retrieved again.
export async function createApiKey(input: {
  name: string;
  client: string;
  scope: "read" | "read_write";
  expiresAt?: Date | null;
  createdById: string;
}): Promise<{ id: string; rawKey: string; prefix: string }> {
  const env = process.env.NODE_ENV === "production" ? "live" : "test";
  const secret = crypto.randomBytes(24).toString("hex");
  const shortId = crypto.randomBytes(2).toString("hex");
  const prefix = `alg_${env}_${shortId}`;
  const rawKey = `${prefix}_${secret}`;

  const key = await prisma.apiKey.create({
    data: {
      name: input.name,
      client: input.client,
      scope: input.scope,
      prefix,
      keyHash: hashKey(rawKey),
      expiresAt: input.expiresAt ?? null,
      createdById: input.createdById,
    },
    select: { id: true },
  });
  return { id: key.id, rawKey, prefix };
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const updated = await prisma.apiKey
    .update({ where: { id }, data: { revokedAt: new Date() } })
    .catch(() => null);
  return Boolean(updated);
}

// Verify an incoming key (for future partner API auth). Active = exists, not
// revoked, not expired. Bumps usage counters. Returned for completeness; the
// partner gateway will call this once those endpoints exist.
export async function verifyApiKey(rawKey: string) {
  const key = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(rawKey) } });
  if (!key || key.revokedAt) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date(), callCount: { increment: 1 } },
  });
  return { id: key.id, client: key.client, scope: key.scope };
}
