import type { NextRequest } from "next/server";
import { AuditAction, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { badRequest, errorResponse } from "@/lib/errors";
import { getPagination, ok, paginationMeta } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { auditListQuerySchema } from "@/lib/validation";
import { serializeAudit } from "@/lib/serializers";


export async function GET(request: NextRequest) {
  try {
    const actor = await requireAuth(request, [Role.SUPER_ADMIN, Role.ADMIN]);

    const url = new URL(request.url);
    const { page, limit, skip, take } = getPagination(url);
    const query = auditListQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );

    const where: Prisma.AuditLogWhereInput = { storeId: actor.id };

    if (query.action) {
      const actions = Object.values(AuditAction) as string[];
      if (!actions.includes(query.action)) {
        throw badRequest("Invalid audit action filter");
      }
      where.action = query.action as AuditAction;
    }

    if (query.entity) {
      where.entity = { equals: query.entity, mode: "insensitive" };
    }

    if (query.actorId) where.actorId = query.actorId;

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }

    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return ok(logs.map(serializeAudit), {
      meta: { pagination: paginationMeta(total, page, limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
