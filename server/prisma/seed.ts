// Development seed — gives a fresh clone a working account to log in with.
//
// Without this, a new developer runs the migrations, gets an empty database,
// tries the shared test credentials, and sees "Incorrect email or password" —
// which reads as "login is broken". Signing up instead strands them on the OTP
// screen, because with no SMTP configured the code only prints to the server
// console.
//
// Safe by construction: refuses to run against a production environment, since
// it creates an account with a known password.

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/tokens.js";

const prisma = new PrismaClient();

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "newsecret99";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "Refusing to seed: this creates an account with a known password and must never run in production.",
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(TEST_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    create: {
      email: TEST_EMAIL,
      name: "Test User",
      passwordHash,
      // Pre-verified so there's no OTP step to get past locally.
      emailVerified: true,
    },
    update: { passwordHash, emailVerified: true },
  });

  // Food orders require a delivery address, so seed one — otherwise the very
  // first thing a developer tries (ordering) is blocked.
  const existingAddress = await prisma.address.findFirst({
    where: { userId: user.id },
  });
  if (!existingAddress) {
    await prisma.address.create({
      data: {
        userId: user.id,
        label: "Home",
        line1: "Flat 12",
        line2: "MG Road",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500081",
        lat: 17.4401,
        lng: 78.3489,
        isDefault: true,
      },
    });
  }

  console.log("Seeded development account:");
  console.log(`  email:    ${TEST_EMAIL}`);
  console.log(`  password: ${TEST_PASSWORD}`);
  console.log("  (email pre-verified, default address added)");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
