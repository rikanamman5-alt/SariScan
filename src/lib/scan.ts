import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getClientIp, getUserAgent } from "@/lib/http";
import { getAppSettings } from "@/lib/settings";
import { serializeScanProduct } from "@/lib/serializers";
import { barcodeSchema } from "@/lib/validation";
import { ApiError, notFound, tooManyRequests } from "@/lib/errors";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { z } from "zod";

const sourceSchema = z.string().trim().min(1).max(40).optional();

export async function performScan(
  request: NextRequest,
  rawBarcode: string,
  rawSource?: string | null,
) {
  const barcode = barcodeSchema.parse(rawBarcode);
  const source = sourceSchema.parse(rawSource ?? undefined);
  const actor = await requireAuth(request);

  const ip = getClientIp(request);
  const rate = checkRateLimit(
    rateLimitKey("scan", ip),
    180,
    60 * 1000,
  );

  if (!rate.allowed) {
    throw tooManyRequests(
      "Too many scans from this device. Please wait a minute and try again.",
    );
  }

  const settings = await getAppSettings();
  if (!settings.scanEnabled) {
    throw new ApiError(
      503,
      "SCAN_DISABLED",
      "Scanning is temporarily disabled by the administrator",
    );
  }

  const product = await prisma.product.findFirst({
    where: { barcode, storeId: actor.id },
  });

  const scannedAt = new Date();

  if (!product || !product.isActive) {
    await prisma.scanLog.create({
      data: {
        storeId: actor.id,
        barcode,
        productId: product?.id ?? null,
        productName: product?.name ?? null,
        priceSnapshot: product?.price ?? null,
        weightSnapshot: product?.weight ?? null,
        weightUnit: product?.weightUnit ?? null,
        source: source ?? settings.scanSourceLabel,
        ipAddress: ip,
        userAgent: getUserAgent(request),
        userId: actor.id,
      },
    });

    throw notFound("Product not found for this barcode");
  }

  await prisma.scanLog.create({
    data: {
      storeId: actor.id,
      barcode,
      productId: product.id,
      productName: product.name,
      priceSnapshot: product.price,
      weightSnapshot: product.weight,
      weightUnit: product.weightUnit,
      source: source ?? settings.scanSourceLabel,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      userId: actor.id,
    },
  });

  return {
    found: true,
    product: serializeScanProduct(product),
    store: {
      name: actor.storeName || settings.storeName,
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
    },
    scannedAt: scannedAt.toISOString(),
  };
}

