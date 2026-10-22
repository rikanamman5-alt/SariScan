import type { NextRequest } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import {
  created,
  getPagination,
  ok,
  paginationMeta,
  parseJson,
} from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { createProductSchema, productListQuerySchema } from "@/lib/validation";
import { serializeProduct } from "@/lib/serializers";
import { recordAudit } from "@/lib/audit";


const userSelect = {
  select: { id: true, name: true, email: true },
} as const;

export async function GET(request: NextRequest) {
  try {
    const actor = await requireAuth(request, [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.STAFF,
    ]);

    const url = new URL(request.url);
    const { page, limit, skip, take } = getPagination(url);
    const query = productListQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );

    const where: Prisma.ProductWhereInput = { storeId: actor.id };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { barcode: { contains: query.search, mode: "insensitive" } },
        { brand: { contains: query.search, mode: "insensitive" } },
        { category: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.category) {
      where.category = { equals: query.category, mode: "insensitive" };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === "true";
    }

    const orderBy = {
      [query.sort]: query.order,
    } as Prisma.ProductOrderByWithRelationInput;

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: { createdBy: userSelect, updatedBy: userSelect },
      }),
    ]);

    return ok(
      products.map(serializeProduct),
      { meta: { pagination: paginationMeta(total, page, limit) } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuth(request);
    const body = await parseJson(request);
    const input = createProductSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        ...input,
        storeId: actor.id,
        createdById: actor.id,
        updatedById: actor.id,
      },
      include: { createdBy: userSelect, updatedBy: userSelect },
    });

    await recordAudit({
      request,
      actor,
      action: "CREATE",
      entity: "PRODUCT",
      entityId: product.id,
      changes: {
        barcode: product.barcode,
        name: product.name,
        price: product.price.toString(),
        weight: product.weight.toString(),
        weightUnit: product.weightUnit,
      },
    });

    return created(serializeProduct(product));
  } catch (error) {
    return errorResponse(error);
  }
}
