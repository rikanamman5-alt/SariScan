import type { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { ok, parseJson } from "@/lib/http";
import { performScan } from "@/lib/scan";
import { barcodeSchema } from "@/lib/validation";


const scanBodySchema = z.object({
  barcode: barcodeSchema,
  source: z.string().trim().min(1).max(40).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseJson(request);
    const { barcode, source } = scanBodySchema.parse(body);
    const result = await performScan(request, barcode, source);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
