import type { NextRequest } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse, forbidden, notFound } from "@/lib/errors";
import { ok, parseJson } from "@/lib/http";
import { hashPassword, requireAuth } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validation";
import { serializeUser } from "@/lib/serializers";
import { recordAudit } from "@/lib/audit";


const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  address: true,
  contactNumber: true,
  storeName: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function getTarget(id: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound("User not found");
  return target;
}

async function assertLastSuperAdmin(target: {
  role: Role;
  isActive: boolean;
}) {
  if (target.role !== Role.SUPER_ADMIN || !target.isActive) return;
  const activeSuperAdmins = await prisma.user.count({
    where: { role: Role.SUPER_ADMIN, isActive: true },
  });
  if (activeSuperAdmins <= 1) {
    throw forbidden(
      "This is the last active Super Admin. Promote another user first.",
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(request, [Role.SUPER_ADMIN]);
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) throw notFound("User not found");
    return ok(serializeUser(user));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAuth(request, [Role.SUPER_ADMIN]);
    const { id } = await params;
    const body = await parseJson(request);
    const input = updateUserSchema.parse(body);

    const target = await getTarget(id);

    if (id === actor.id) {
      if (input.isActive === false) {
        throw forbidden("You cannot deactivate your own account");
      }
      if (input.role && input.role !== Role.SUPER_ADMIN) {
        throw forbidden("You cannot demote your own account");
      }
    }

    const removesSuperAccess =
      target.role === Role.SUPER_ADMIN &&
      target.isActive &&
      ((input.role && input.role !== Role.SUPER_ADMIN) ||
        input.isActive === false);

    if (removesSuperAccess) {
      await assertLastSuperAdmin(target);
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.role !== undefined) data.role = input.role;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    let passwordChanged = false;
    if (input.password !== undefined) {
      data.passwordHash = await hashPassword(input.password);
      data.tokenVersion = { increment: 1 };
      passwordChanged = true;
    } else if (input.isActive === false) {
      data.tokenVersion = { increment: 1 };
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    const action =
      input.isActive !== undefined && input.isActive !== target.isActive
        ? input.isActive
          ? "ACTIVATE"
          : "DEACTIVATE"
        : passwordChanged && Object.keys(data).length === 1
          ? "PASSWORD_CHANGE"
          : "UPDATE";

    await recordAudit({
      request,
      actor,
      action,
      entity: "USER",
      entityId: id,
      changes: {
        ...input,
        password: passwordChanged ? "[changed]" : undefined,
      },
    });

    return ok(serializeUser(updated));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAuth(request, [Role.SUPER_ADMIN]);
    const { id } = await params;

    if (id === actor.id) {
      throw forbidden("You cannot delete your own account");
    }

    const target = await getTarget(id);
    await assertLastSuperAdmin(target);

    await prisma.user.delete({ where: { id } });

    await recordAudit({
      request,
      actor,
      action: "DELETE",
      entity: "USER",
      entityId: id,
      changes: {
        name: target.name,
        email: target.email,
        role: target.role,
      },
    });

    return ok({ deleted: true, id });
  } catch (error) {
    return errorResponse(error);
  }
}
