import { connection, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET() {
  await connection();

  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      success: true,
      data: {
        status: "ok",
        database: "up",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      },
    });
  } catch (error) {
    console.error("[health] database check failed", error);
    return NextResponse.json(
      {
        success: false,
        data: {
          status: "degraded",
          database: "down",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 },
    );
  }
}
