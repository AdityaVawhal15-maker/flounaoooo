#!/usr/bin/env node
// Grant or revoke a back-office role for an existing user — the ONLY way the
// first super_admin is created. There is deliberately no HTTP endpoint that can
// bootstrap a privileged account, so there is no public surface to attack.
//
// Run from the server/ directory (loads .env for DATABASE_URL):
//   node --env-file=.env scripts/set-role.mjs <email> <role>
//
//   <role> = user | developer | admin | super_admin
//
// Examples:
//   node --env-file=.env scripts/set-role.mjs founder@algorithec.in super_admin
//   node --env-file=.env scripts/set-role.mjs ops@algorithec.in admin
//   node --env-file=.env scripts/set-role.mjs olddev@algorithec.in user   # revoke
//
// The user must already exist (sign up in the app first). The change is written
// straight to the DB and recorded in the audit log as a system action.

import { PrismaClient } from "@prisma/client";

const ROLES = ["user", "developer", "admin", "super_admin"];

const [, , emailArg, roleArg] = process.argv;

if (!emailArg || !roleArg) {
  console.error("Usage: node --env-file=.env scripts/set-role.mjs <email> <role>");
  console.error(`  <role> = ${ROLES.join(" | ")}`);
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const role = roleArg.trim().toLowerCase();

if (!ROLES.includes(role)) {
  console.error(`Invalid role "${role}". Must be one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email "${email}". They must sign up first.`);
    process.exit(1);
  }

  if (user.role === role) {
    console.log(`${email} is already "${role}". Nothing to do.`);
    process.exit(0);
  }

  const previous = user.role;
  await prisma.user.update({ where: { id: user.id }, data: { role } });

  // Record the change in the tamper-evident audit trail as a system action.
  await prisma.auditLog.create({
    data: {
      actorId: null,
      actorRole: "super_admin",
      action: "role.set_cli",
      targetType: "user",
      targetId: user.id,
      summary: `CLI set ${email} from "${previous}" to "${role}"`,
      metadata: JSON.stringify({ previous, next: role, via: "set-role.mjs" }),
    },
  });

  console.log(`✓ ${email}: "${previous}" → "${role}"`);
} catch (err) {
  console.error("Failed to set role:", err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
