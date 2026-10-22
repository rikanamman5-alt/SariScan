import type { NextRequest } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import { getPagination, ok, paginationMeta } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { scanListQuerySchema } from "@/lib/validation";
import { serializeScan } from "@/lib/serializers";


export async function GET(request: NextRequest) {
  try {
    const actor = await requireAuth(request, [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.STAFF,
    ]);

    const url = new URL(request.url);
    const { page, limit, skip, take } = getPagination(url);
    const query = scanListQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );

    const where: Prisma.ScanLogWhereInput = { storeId: actor.id };

    if (query.barcode) {
      where.barcode = { contains: query.barcode, mode: "insensitive" };
    }
    if (query.productId) where.productId = query.productId;
    if (query.userId) where.userId = query.userId;

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }

    const [total, scans] = await prisma.$transaction([
      prisma.scanLog.count({ where }),
      prisma.scanLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          product: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return ok(scans.map(serializeScan), {
      meta: { pagination: paginationMeta(total, page, limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
