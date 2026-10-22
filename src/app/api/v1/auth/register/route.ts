import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { conflict, errorResponse, tooManyRequests } from "@/lib/errors";
import { created, getClientIp, parseJson } from "@/lib/http";
import { registerSchema } from "@/lib/validation";
import {
  getTokenTtlSeconds,
  hashPassword,
  setAuthCookie,
  signAuthToken,
} from "@/lib/auth";
import { serializeUser } from "@/lib/serializers";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(
      rateLimitKey("register:ip", ip),
      10,
      15 * 60 * 1000,
    );

    if (!rate.allowed) {
      throw tooManyRequests(
        "Too many accounts created from this device. Please try again later.",
      );
    }

    const body = await parseJson(request);
    const { name, email, password, storeName } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw conflict("An account with this email already exists");
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: Role.STAFF,
        isActive: true,
        storeName,
      },
    });

    const token = await signAuthToken(user);
    const actor = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      tokenVersion: user.tokenVersion,
      storeName: user.storeName,
    };

    await recordAudit({
      request,
      actor,
      action: "CREATE",
      entity: "USER",
      entityId: user.id,
      changes: {
        name: user.name,
        email: user.email,
        role: user.role,
        storeName: user.storeName,
      },
    });

    await recordAudit({
      request,
      actor,
      action: "LOGIN",
      entity: "AUTH",
      entityId: user.id,
    });

    const response = created({
      token,
      tokenType: "Bearer",
      expiresIn: getTokenTtlSeconds(),
      user: serializeUser(user),
    });

    return setAuthCookie(response, token);
  } catch (error) {
    return errorResponse(error);
  }
}
