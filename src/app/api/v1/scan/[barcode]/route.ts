import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { ok } from "@/lib/http";
import { performScan } from "@/lib/scan";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> },
) {
  try {
    const { barcode } = await params;
    const source = request.nextUrl.searchParams.get("source");
    const result = await performScan(request, barcode, source);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
