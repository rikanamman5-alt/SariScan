import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { errorResponse } from "@/lib/errors";
import { ok, parseJson } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { getAppSettings, saveAppSettings } from "@/lib/settings";
import { updateAppSettingsSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";


export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF]);
    const settings = await getAppSettings();
    return ok(settings);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAuth(request, [Role.SUPER_ADMIN]);
    const body = await parseJson(request);
    const input = updateAppSettingsSchema.parse(body);

    const current = await getAppSettings();
    const updated = await saveAppSettings({ ...current, ...input });

    await recordAudit({
      request,
      actor,
      action: "SETTINGS_UPDATE",
      entity: "SETTINGS",
      changes: input,
    });

    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
