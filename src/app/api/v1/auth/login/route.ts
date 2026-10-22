import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, ok, parseJson } from "@/lib/http";
import { errorResponse, forbidden, tooManyRequests, unauthorized } from "@/lib/errors";
import { loginSchema } from "@/lib/validation";
import {
  getTokenTtlSeconds,
  setAuthCookie,
  signAuthToken,
  verifyPassword,
} from "@/lib/auth";
import { serializeUser } from "@/lib/serializers";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";


export async function POST(request: NextRequest) {
  try {
    const body = await parseJson(request);
    const { email, password } = loginSchema.parse(body);
    const ip = getClientIp(request);

    const ipLimit = checkRateLimit(
      rateLimitKey("login:ip", ip),
      20,
      5 * 60 * 1000,
    );
    const emailLimit = checkRateLimit(
      rateLimitKey("login:email", email),
      8,
      5 * 60 * 1000,
    );

    if (!ipLimit.allowed || !emailLimit.allowed) {
      throw tooManyRequests(
        "Too many login attempts. Please try again in a few minutes.",
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user
      ? await verifyPassword(password, user.passwordHash)
      : false;

    if (!user || !valid) {
      await recordAudit({
        request,
        actorEmail: email,
        storeId: user?.id ?? null,
        action: "LOGIN_FAILED",
        entity: "AUTH",
        changes: { email },
      });
      throw unauthorized("Invalid email or password");
    }

    if (!user.isActive) {
      await recordAudit({
        request,
        actorEmail: email,
        storeId: user?.id ?? null,
        action: "LOGIN_FAILED",
        entity: "AUTH",
        changes: { email, reason: "inactive" },
      });
      throw forbidden("This account has been disabled");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signAuthToken(updated);
    const actor = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      tokenVersion: updated.tokenVersion,
      storeName: updated.storeName,
    };

    await recordAudit({
      request,
      actor,
      action: "LOGIN",
      entity: "AUTH",
      entityId: updated.id,
    });

    const response = ok({
      token,
      tokenType: "Bearer",
      expiresIn: getTokenTtlSeconds(),
      user: serializeUser(updated),
    });

    return setAuthCookie(response, token);
  } catch (error) {
    return errorResponse(error);
  }
}
