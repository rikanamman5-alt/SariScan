import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { ok } from "@/lib/http";
import { clearAuthCookie, getAuthUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";


export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (user) {
      await recordAudit({
        request,
        actor: user,
        action: "LOGOUT",
        entity: "AUTH",
        entityId: user.id,
      });
    }

    return clearAuthCookie(ok({ loggedOut: true }));
  } catch (error) {
    return errorResponse(error);
  }
}
