import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, unauthorized } from "@/lib/errors";
import { ok, parseJson } from "@/lib/http";
import {
  getTokenTtlSeconds,
  hashPassword,
  requireAuth,
  setAuthCookie,
  signAuthToken,
  verifyPassword,
} from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";


export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuth(request);
    const body = await parseJson(request);
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
    });

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw unauthorized("Current password is incorrect");

    const passwordHash = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    const token = await signAuthToken(updated);

    await recordAudit({
      request,
      actor,
      action: "PASSWORD_CHANGE",
      entity: "USER",
      entityId: user.id,
    });

    return setAuthCookie(
      ok({
        message: "Password updated successfully",
        token,
        expiresIn: getTokenTtlSeconds(),
      }),
      token,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
