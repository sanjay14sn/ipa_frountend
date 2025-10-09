import { useState, useEffect } from "react";

interface UsePaginatedDataParams<T> {
  fetchFn: (params: any) => Promise<{
    data: T[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>;
  limit?: number;
  refreshTrigger?: number;
  additionalParams?: Record<string, any>;
}

export function usePaginatedData<T>({
  fetchFn,
  limit = 10,
  refreshTrigger = 0,
  additionalParams = {},
}: UsePaginatedDataParams<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortBy, sortOrder, ...Object.values(additionalParams)]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await fetchFn({
          page: currentPage,
          limit,
          search: debouncedSearch,
          sortBy,
          sortOrder,
          ...additionalParams,
        });
        setData(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    currentPage,
    debouncedSearch,
    sortBy,
    sortOrder,
    refreshTrigger,
    limit,
    JSON.stringify(additionalParams),
  ]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
  };

  return {
    data,
    loading,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
    currentPage,
    setCurrentPage,
    totalPages,
    total,
  };
}
