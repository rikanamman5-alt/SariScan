import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import { created, parseJson } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { importProductsSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";


export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuth(request, [Role.SUPER_ADMIN, Role.ADMIN]);
    const body = await parseJson(request);
    const { mode, products } = importProductsSchema.parse(body);

    if (mode === "insert") {
      const result = await prisma.product.createMany({
        data: products.map((product) => ({
          ...product,
          storeId: actor.id,
          createdById: actor.id,
          updatedById: actor.id,
        })),
        skipDuplicates: false,
      });

      await recordAudit({
        request,
        actor,
        action: "IMPORT",
        entity: "PRODUCT",
        changes: { mode, created: result.count, updated: 0 },
      });

      return created({
        mode,
        created: result.count,
        updated: 0,
        total: products.length,
      });
    }

    const barcodes = products.map((product) => product.barcode);
    const existing = await prisma.product.findMany({
      where: { storeId: actor.id, barcode: { in: barcodes } },
      select: { barcode: true },
    });
    const existingSet = new Set(existing.map((item) => item.barcode));

    await prisma.$transaction(
      products.map((product) =>
        prisma.product.upsert({
          where: {
            storeId_barcode: { storeId: actor.id, barcode: product.barcode },
          },
          create: {
            ...product,
            storeId: actor.id,
            createdById: actor.id,
            updatedById: actor.id,
          },
          update: {
            ...product,
            updatedById: actor.id,
          },
        }),
      ),
    );

    const updatedCount = products.filter((product) =>
      existingSet.has(product.barcode),
    ).length;
    const createdCount = products.length - updatedCount;

    await recordAudit({
      request,
      actor,
      action: "IMPORT",
      entity: "PRODUCT",
      changes: {
        mode,
        created: createdCount,
        updated: updatedCount,
      },
    });

    return created({
      mode,
      created: createdCount,
      updated: updatedCount,
      total: products.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
