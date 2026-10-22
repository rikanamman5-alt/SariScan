import type { NextRequest } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { badRequest, errorResponse } from "@/lib/errors";
import {
  created,
  getPagination,
  ok,
  paginationMeta,
  parseJson,
} from "@/lib/http";
import { hashPassword, requireAuth } from "@/lib/auth";
import { createUserSchema, userListQuerySchema } from "@/lib/validation";
import { serializeUser } from "@/lib/serializers";
import { recordAudit } from "@/lib/audit";


export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, [Role.SUPER_ADMIN]);

    const url = new URL(request.url);
    const { page, limit, skip, take } = getPagination(url);
    const query = userListQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );

    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.role) {
      const roles = Object.values(Role) as string[];
      if (!roles.includes(query.role)) {
        throw badRequest("Invalid role filter");
      }
      where.role = query.role as Role;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === "true";
    }

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
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
        },
      }),
    ]);

    return ok(users.map(serializeUser), {
      meta: { pagination: paginationMeta(total, page, limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuth(request, [Role.SUPER_ADMIN]);
    const body = await parseJson(request);
    const input = createUserSchema.parse(body);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        isActive: input.isActive,
      },
      select: {
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
      },
    });

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
        isActive: user.isActive,
      },
    });

    return created(serializeUser(user));
  } catch (error) {
    return errorResponse(error);
  }
}
