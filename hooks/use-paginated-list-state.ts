/** Derive table state from a paginated list query (`{ data, meta }` shape). */
export function usePaginatedListState<T>(query: {
  data?: { data: T[]; meta: { total: number; totalPages: number } };
  isLoading: boolean;
}) {
  const rows = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const totalPages = query.data?.meta.totalPages ?? 1;
  const loading = query.isLoading && !query.data;
  return { rows, total, totalPages, loading };
}
