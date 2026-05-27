"use client";

import { useQuery, type UseQueryOptions, type QueryKey } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";

/**
 * Generic wrapper around `useQuery` that plumbs TanStack Query's AbortSignal
 * through to the underlying request. When a component unmounts or the query
 * becomes unused, the signal fires and the in-flight request is cancelled.
 *
 * @see https://tanstack.com/query/v5/docs/framework/react/guides/query-cancellation
 *
 * Usage:
 *   const { data } = useApiQuery(
 *     queryKeys.students.list(params),
 *     (signal) => api.get('/students', { params, signal }).then(r => unwrapData(r)),
 *   );
 */
export function useApiQuery<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: (signal: AbortSignal) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, "queryKey" | "queryFn">,
) {
  return useQuery<TData, TError, TData, QueryKey>({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    ...options,
  });
}

/**
 * Merge an AbortSignal into an existing axios request config.
 *
 * Convenience helper for use inside plain `useQuery` `queryFn` callbacks:
 *
 *   queryFn: ({ signal }) =>
 *     api.get(url, withSignal({ params }, signal)).then(r => r.data)
 */
export function withSignal(
  config: AxiosRequestConfig,
  signal: AbortSignal,
): AxiosRequestConfig {
  return { ...config, signal };
}
