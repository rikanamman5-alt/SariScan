import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message = "Invalid request", details?: unknown) =>
  new ApiError(400, "BAD_REQUEST", message, details);

export const unauthorized = (message = "Authentication required") =>
  new ApiError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You do not have permission to do this") =>
  new ApiError(403, "FORBIDDEN", message);

export const notFound = (message = "Resource not found") =>
  new ApiError(404, "NOT_FOUND", message);

export const conflict = (message = "Resource already exists") =>
  new ApiError(409, "CONFLICT", message);

export const tooManyRequests = (message = "Too many requests, please slow down") =>
  new ApiError(429, "RATE_LIMITED", message);

export function errorResponse(error: unknown) {
  unstable_rethrow(error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Some fields are invalid",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const fields = Array.isArray(error.meta?.target)
        ? (error.meta.target as string[])
        : [];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE",
            message: fields.includes("barcode")
              ? "A product with this barcode already exists"
              : fields.includes("email")
                ? "A user with this email already exists"
                : "This record already exists",
            details: { fields },
          },
        },
        { status: 409 },
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Resource not found" },
        },
        { status: 404 },
      );
    }
  }

  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
      },
    },
    { status: 500 },
  );
}
