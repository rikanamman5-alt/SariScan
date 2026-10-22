import type { AuditAction, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent } from "@/lib/http";
import type { AuthUser } from "@/lib/auth";

type AuditInput = {
  request?: NextRequest;
  actor?: AuthUser | null;
  actorEmail?: string | null;
  storeId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  changes?: Prisma.InputJsonValue | null;
};

export async function recordAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        storeId: input.storeId ?? input.actor?.id ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        actorId: input.actor?.id ?? null,
        actorEmail: input.actor?.email ?? input.actorEmail ?? null,
        changes: input.changes ?? undefined,
        ipAddress: input.request ? getClientIp(input.request) : null,
        userAgent: input.request ? getUserAgent(input.request) : null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}
