import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { ok } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { serializeUser } from "@/lib/serializers";
import { prisma } from "@/lib/prisma";


export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const fresh = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    return ok({ user: serializeUser(fresh) });
  } catch (error) {
    return errorResponse(error);
  }
}
