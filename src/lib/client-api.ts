import type { Pagination } from "@/lib/types";

export type ApiFieldError = {
  field: string;
  message: string;
};

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: ApiFieldError[];

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiFieldError[],
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  meta?: { pagination?: Pagination };
  error?: {
    code: string;
    message: string;
    details?: ApiFieldError[];
  };
};

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; meta?: { pagination?: Pagination } }> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Cannot reach the server. Check your connection and try again.",
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null;

  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("sariscan:unauthorized"));
  }

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
      payload?.error?.message ?? "The request failed. Please try again.",
      payload?.error?.details,
    );
  }

  return { data: payload.data as T, meta: payload.meta };
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const result = await apiRequest<T>(path, init);
  return result.data;
}
