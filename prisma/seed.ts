import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function seedSuperAdmin() {
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
  const email = (process.env.SUPER_ADMIN_EMAIL || "admin@sariscan.local")
    .trim()
    .toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "Admin@12345";
  const resetPassword = process.env.SEED_RESET_PASSWORD === "true";

  if (password.length < 8) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log(`[seed] Super admin created: ${email}`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: {
      role: Role.SUPER_ADMIN,
      isActive: true,
      ...(resetPassword
        ? { passwordHash, tokenVersion: { increment: 1 } }
        : {}),
    },
  });

  console.log(
    `[seed] Super admin already exists: ${email}${
      resetPassword ? " (password reset)" : ""
    }`,
  );
}

async function seedSettings() {
  const existing = await prisma.setting.findUnique({ where: { key: "app" } });
  if (existing) {
    console.log("[seed] App settings already exist");
    return;
  }

  await prisma.setting.create({
    data: {
      key: "app",
      value: {
        storeName: "SariScan",
        currency: "PHP",
        currencySymbol: "₱",
        lowStockThreshold: 10,
        scanEnabled: true,
        scanSourceLabel: "WEB",
      },
    },
  });

  console.log("[seed] Default app settings created");
}

async function main() {
  await seedSuperAdmin();
  await seedSettings();
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
