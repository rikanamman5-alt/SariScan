"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, ApiClientError } from "@/lib/client-api";
import type { Pagination } from "@/lib/types";

type ApiState<T> = {
  key: string;
  data: T | null;
  pagination: Pagination | null;
  error: ApiClientError | null;
};

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<ApiState<T>>({
    key: "",
    data: null,
    pagination: null,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = path ? `${path}::${reloadKey}` : "";

  useEffect(() => {
    if (!path) return;

    let cancelled = false;
    const key = `${path}::${reloadKey}`;

    apiRequest<T>(path)
      .then((result) => {
        if (cancelled) return;
        setState({
          key,
          data: result.data,
          pagination: result.meta?.pagination ?? null,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          key,
          data: null,
          pagination: null,
          error:
            error instanceof ApiClientError
              ? error
              : new ApiClientError(0, "UNKNOWN", "Something went wrong"),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const matched = path !== null && state.key === requestKey;

  return {
    data: matched ? state.data : null,
    pagination: matched ? state.pagination : null,
    loading: path !== null && !matched,
    error: matched ? state.error : null,
    reload,
  };
}

export function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
