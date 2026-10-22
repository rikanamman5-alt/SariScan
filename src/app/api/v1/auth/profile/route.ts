import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import { ok, parseJson } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validation";
import { serializeUser } from "@/lib/serializers";
import { recordAudit } from "@/lib/audit";

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAuth(request);
    const body = await parseJson(request);
    const input = updateProfileSchema.parse(body);

    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.storeName !== undefined) data.storeName = input.storeName;
    if (input.contactNumber !== undefined) {
      data.contactNumber = input.contactNumber;
    }
    if (input.address !== undefined) data.address = input.address;
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

    const updated = await prisma.user.update({
      where: { id: actor.id },
      data,
    });

    await recordAudit({
      request,
      actor,
      action: "UPDATE",
      entity: "USER",
      entityId: actor.id,
      changes: {
        ...input,
        avatarUrl: input.avatarUrl ? "[updated]" : undefined,
      },
    });

    return ok(serializeUser(updated));
  } catch (error) {
    return errorResponse(error);
  }
}
