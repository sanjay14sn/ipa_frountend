"use client";

import React, { useState, useEffect, Fragment, ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronRight,
  Search,
  ChevronLeft,
  ChevronFirst,
  ChevronLast,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// Generic types for the table
export interface AdminTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T) => ReactNode;
}

export interface AdminTableFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}

export interface AdminTableMultiSelectFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export interface AdminTableSortOption {
  value: string;
  label: string;
}

export interface AdminTablePaginationMeta {
  total: number;
  totalPages: number;
}

export interface AdminTableProps<T> {
  // Data
  data: T[];
  loading?: boolean;

  // Columns
  columns: AdminTableColumn<T>[];

  // Row identification
  getRowId: (item: T) => string;

  // Row rendering
  renderMainCell: (item: T) => ReactNode;
  renderExpandedContent?: (item: T) => ReactNode;

  // Search
  searchPlaceholder?: string;
  onSearchChange?: (search: string) => void;

  // Filters
  filters?: AdminTableFilter[];
  multiSelectFilters?: AdminTableMultiSelectFilter[];
  onFilterChange?: (key: string, value: string | string[]) => void;

  // Sorting
  sortOptions?: AdminTableSortOption[];
  defaultSortBy?: string;
  defaultSortOrder?: "ASC" | "DESC";
  onSortChange?: (sortBy: string, sortOrder: "ASC" | "DESC") => void;

  // Pagination
  pagination?: AdminTablePaginationMeta;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;

  // Empty state
  emptyMessage?: string;

  // Results text
  resultsText?: (count: number, total: number) => string;
}

export default function AdminTable<T>({
  data,
  loading = false,
  columns,
  getRowId,
  renderMainCell,
  renderExpandedContent,
  searchPlaceholder = "Search...",
  onSearchChange,
  filters = [],
  multiSelectFilters = [],
  onFilterChange,
  sortOptions = [],
  defaultSortBy,
  defaultSortOrder = "DESC",
  onSortChange,
  pagination,
  currentPage = 1,
  onPageChange,
  itemsPerPage = 10,
  emptyMessage = "No items found matching your criteria",
  resultsText = (count, total) => `Showing ${count} of ${total} items`,
}: AdminTableProps<T>) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filter states
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      filters.forEach((f) => {
        initial[f.key] = f.defaultValue || "all";
      });
      return initial;
    }
  );

  const [multiSelectValues, setMultiSelectValues] = useState<
    Record<string, string[]>
  >({});

  // Sort state
  const [sortBy, setSortBy] = useState(
    defaultSortBy || sortOptions[0]?.value || ""
  );
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">(defaultSortOrder);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (onSearchChange) {
        onSearchChange(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearchChange]);

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    if (onFilterChange) {
      onFilterChange(key, value);
    }
  };

  // Handle multi-select filter
  const handleMultiSelectToggle = (filterKey: string, value: string) => {
    setMultiSelectValues((prev) => {
      const current = prev[filterKey] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      if (onFilterChange) {
        onFilterChange(filterKey, updated);
      }

      return { ...prev, [filterKey]: updated };
    });
  };

  const handleMultiSelectClear = (filterKey: string) => {
    setMultiSelectValues((prev) => ({ ...prev, [filterKey]: [] }));
    if (onFilterChange) {
      onFilterChange(filterKey, []);
    }
  };

  // Handle sort change
  const handleSortByChange = (value: string) => {
    setSortBy(value);
    if (onSortChange) {
      onSortChange(value, sortOrder);
    }
  };

  const toggleSortOrder = () => {
    const newOrder = sortOrder === "ASC" ? "DESC" : "ASC";
    setSortOrder(newOrder);
    if (onSortChange) {
      onSortChange(sortBy, newOrder);
    }
  };

  const toggleRow = (id: string) => {
    const isParentRow = data.some((item) => getRowId(item) === id);
    
    if (isParentRow) {
      if (expandedRow === id) {
        setExpandedRow(null);
        setExpandedChildren(new Set());
      } else {
        setExpandedRow(id);
        setExpandedChildren(new Set());
      }
    } else {
      const newExpandedChildren = new Set(expandedChildren);
      if (newExpandedChildren.has(id)) {
        newExpandedChildren.delete(id);
      } else {
        newExpandedChildren.add(id);
      }
      setExpandedChildren(newExpandedChildren);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {(onSearchChange ||
        filters.length > 0 ||
        multiSelectFilters.length > 0 ||
        sortOptions.length > 0) && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {onSearchChange && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>

          {(filters.length > 0 ||
            multiSelectFilters.length > 0 ||
            sortOptions.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {/* Standard filters */}
              {filters.map((filter) => (
                <Select
                  key={filter.key}
                  value={filterValues[filter.key]}
                  onValueChange={(value) =>
                    handleFilterChange(filter.key, value)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option, idx) => (
                      <SelectItem
                        key={`${filter.key}-${option.value ?? option.label ?? `idx-${idx}`}`}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}

              {/* Multi-select filters */}
              {multiSelectFilters.map((filter) => (
                <Popover key={filter.key}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[200px] justify-between text-left font-normal"
                    >
                      {(multiSelectValues[filter.key]?.length || 0) === 0 ? (
                        <span>{filter.placeholder || filter.label}</span>
                      ) : (
                        <span className="truncate">
                          {multiSelectValues[filter.key].length} selected
                        </span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {filter.label}
                        </span>
                        {(multiSelectValues[filter.key]?.length || 0) > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleMultiSelectClear(filter.key)}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-2">
                      {filter.options.map((option, idx) => (
                        <div
                          key={`${filter.key}-${option.value ?? option.label ?? `idx-${idx}`}`}
                          className="flex items-center space-x-2 py-2 px-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() =>
                            handleMultiSelectToggle(filter.key, option.value)
                          }
                        >
                          <Checkbox
                            checked={(
                              multiSelectValues[filter.key] || []
                            ).includes(option.value)}
                            onCheckedChange={() =>
                              handleMultiSelectToggle(filter.key, option.value)
                            }
                          />
                          <label className="text-sm cursor-pointer flex-1">
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ))}

              {/* Sort controls */}
              {sortOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={handleSortByChange}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSortOrder}
                    className="h-9 px-3"
                  >
                    {sortOrder === "ASC" ? (
                      <>
                        <ArrowUp className="h-4 w-4 mr-1" />
                        <span className="text-xs">Asc</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-4 w-4 mr-1" />
                        <span className="text-xs">Desc</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      {pagination && (
        <div className="text-sm text-gray-600">
          {loading ? (
            <div className="h-5 w-48 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            resultsText(data.length, pagination.total)
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8"
                >
                  <div className="text-gray-500">{emptyMessage}</div>
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              data.map((item, index) => {
                const rowId = getRowId(item);
                const isExpanded = expandedRow === rowId;

                return (
                  <Fragment key={rowId}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className={columns[0].className}>
                        <div className="flex items-center gap-2">
                          {renderExpandedContent && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(rowId);
                              }}
                              className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <div className="flex-1">{renderMainCell(item)}</div>
                        </div>
                      </TableCell>

                      {columns.slice(1).map((column) => (
                        <TableCell
                          key={column.key}
                          className={column.className}
                        >
                          {column.render ? column.render(item) : null}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Expanded Details Row */}
                    {isExpanded && renderExpandedContent && (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="p-0">
                          {renderExpandedContent(item)}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && !loading && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(1)}
              disabled={currentPage === 1}
            >
              <ChevronFirst className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from(
              { length: Math.min(5, pagination.totalPages) },
              (_, i) => {
                const pageNum =
                  Math.max(
                    1,
                    Math.min(pagination.totalPages - 4, currentPage - 2)
                  ) + i;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange?.(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              }
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.totalPages)}
              disabled={currentPage === pagination.totalPages}
            >
              <ChevronLast className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
