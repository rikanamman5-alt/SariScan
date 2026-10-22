import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, notFound } from "@/lib/errors";
import { ok, parseJson } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { updateProductSchema } from "@/lib/validation";
import { serializeProduct } from "@/lib/serializers";
import { recordAudit } from "@/lib/audit";

const userSelect = {
  select: { id: true, name: true, email: true },
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAuth(request);
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, storeId: actor.id },
      include: { createdBy: userSelect, updatedBy: userSelect },
    });

    if (!product) throw notFound("Product not found");
    return ok(serializeProduct(product));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAuth(request);
    const { id } = await params;
    const body = await parseJson(request);
    const input = updateProductSchema.parse(body);

    const existing = await prisma.product.findFirst({
      where: { id, storeId: actor.id },
    });
    if (!existing) throw notFound("Product not found");

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...input,
        updatedById: actor.id,
      },
      include: { createdBy: userSelect, updatedBy: userSelect },
    });

    const isStatusChange =
      typeof input.isActive === "boolean" &&
      input.isActive !== existing.isActive;

    await recordAudit({
      request,
      actor,
      action: isStatusChange
        ? input.isActive
          ? "ACTIVATE"
          : "DEACTIVATE"
        : "UPDATE",
      entity: "PRODUCT",
      entityId: product.id,
      changes: input,
    });

    return ok(serializeProduct(product));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAuth(request);
    const { id } = await params;

    const existing = await prisma.product.findFirst({
      where: { id, storeId: actor.id },
    });
    if (!existing) throw notFound("Product not found");

    await prisma.product.delete({ where: { id } });

    await recordAudit({
      request,
      actor,
      action: "DELETE",
      entity: "PRODUCT",
      entityId: id,
      changes: {
        barcode: existing.barcode,
        name: existing.name,
        price: existing.price.toString(),
      },
    });

    return ok({ deleted: true, id });
  } catch (error) {
    return errorResponse(error);
  }
}
