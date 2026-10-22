import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import { ok } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { serializeScan } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireAuth(request, [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.STAFF,
    ]);

    const settings = await getAppSettings();
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const startOf7Days = new Date(startOfToday);
    startOf7Days.setUTCDate(startOf7Days.getUTCDate() - 6);
    const startOf30Days = new Date(startOfToday);
    startOf30Days.setUTCDate(startOf30Days.getUTCDate() - 29);
    const lowStockThreshold = settings.lowStockThreshold;

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      activeStockRows,
      totalScans,
      scansToday,
      scansLast7Days,
      recentScans,
      topRows,
      dailyRows,
      newProducts7Days,
    ] = await Promise.all([
      prisma.product.count({ where: { storeId: actor.id } }),
      prisma.product.count({
        where: { storeId: actor.id, isActive: true },
      }),
      prisma.product.count({
        where: {
          storeId: actor.id,
          isActive: true,
          stock: { lte: lowStockThreshold },
        },
      }),
      prisma.product.findMany({
        where: { storeId: actor.id, isActive: true },
        select: { price: true, stock: true },
      }),
      prisma.scanLog.count({ where: { storeId: actor.id } }),
      prisma.scanLog.count({
        where: { storeId: actor.id, createdAt: { gte: startOfToday } },
      }),
      prisma.scanLog.count({
        where: { storeId: actor.id, createdAt: { gte: startOf7Days } },
      }),
      prisma.scanLog.findMany({
        where: { storeId: actor.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          product: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.$queryRaw<Array<{ barcode: string; count: number }>>`
        SELECT "barcode", COUNT(*)::int AS count
        FROM "ScanLog"
        WHERE "storeId" = ${actor.id}
          AND "createdAt" >= ${startOf30Days}
          AND "productId" IS NOT NULL
        GROUP BY "barcode"
        ORDER BY count DESC
        LIMIT 5
      `,
      prisma.$queryRaw<Array<{ day: Date; count: number }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
        FROM "ScanLog"
        WHERE "storeId" = ${actor.id}
          AND "createdAt" >= ${startOf7Days}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.product.count({
        where: { storeId: actor.id, createdAt: { gte: startOf7Days } },
      }),
    ]);

    const inventoryValue = activeStockRows.reduce(
      (sum, product) =>
        sum + Number(product.price.toString()) * Number(product.stock.toString()),
      0,
    );

    const topBarcodes = topRows.map((row) => row.barcode);
    const topProducts = await prisma.product.findMany({
      where: { storeId: actor.id, barcode: { in: topBarcodes } },
      select: { barcode: true, name: true, price: true },
    });
    const productByBarcode = new Map(
      topProducts.map((product) => [product.barcode, product]),
    );

    const dailyMap = new Map(
      dailyRows.map((row) => [
        row.day.toISOString().slice(0, 10),
        Number(row.count),
      ]),
    );
    const scansPerDay: Array<{ date: string; count: number }> = [];
    for (let index = 0; index < 7; index += 1) {
      const day = new Date(startOf7Days);
      day.setUTCDate(day.getUTCDate() + index);
      const key = day.toISOString().slice(0, 10);
      scansPerDay.push({ date: key, count: dailyMap.get(key) ?? 0 });
    }

    return ok({
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
        lowStock: lowStockProducts,
        newLast7Days: newProducts7Days,
      },
      inventory: {
        value: inventoryValue,
      },
      scans: {
        total: totalScans,
        today: scansToday,
        last7Days: scansLast7Days,
        perDay: scansPerDay,
      },
      topProducts: topRows.map((row) => ({
        barcode: row.barcode,
        name: productByBarcode.get(row.barcode)?.name ?? row.barcode,
        price: productByBarcode.get(row.barcode)?.price
          ? Number(productByBarcode.get(row.barcode)?.price)
          : null,
        scans: Number(row.count),
      })),
      recentScans: recentScans.map(serializeScan),
      settings,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
