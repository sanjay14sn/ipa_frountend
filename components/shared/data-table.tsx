"use client";

/**
 * Global data table for admin & franchisee list pages: search, filters, sort,
 * pagination, expandable rows. Built on `@/components/ui/table` primitives.
 */

import React, { useState, useEffect, useRef, Fragment, ReactNode, useMemo } from "react";
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
  Inbox,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RawTableSurface,
  TableStatusBar,
  TableToolbarPanel,
} from "./table-shell";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T) => ReactNode;
}

export interface DataTableFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}

export interface DataTableMultiSelectFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export interface DataTableSortOption {
  value: string;
  label: string;
}

export interface DataTablePaginationMeta {
  total: number;
  totalPages: number;
}

export interface DataTableExpandedSection {
  title: string;
  icon?: ReactNode;
  content: ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  loading?: boolean;
  columns: DataTableColumn<T>[];
  getRowId: (item: T) => string;
  renderMainCell: (item: T) => ReactNode;
  renderExpandedContent?: (item: T) => ReactNode;
  /** Optional structured cards below custom expanded content (or alone if no renderExpandedContent). */
  expandedSections?: (item: T) => DataTableExpandedSection[] | undefined;
  multiExpand?: boolean;
  onRowClick?: (item: T) => void;
  searchPlaceholder?: string;
  onSearchChange?: (search: string) => void;
  filters?: DataTableFilter[];
  multiSelectFilters?: DataTableMultiSelectFilter[];
  onFilterChange?: (key: string, value: string | string[]) => void;
  sortOptions?: DataTableSortOption[];
  defaultSortBy?: string;
  defaultSortOrder?: "ASC" | "DESC";
  onSortChange?: (sortBy: string, sortOrder: "ASC" | "DESC") => void;
  pagination?: DataTablePaginationMeta;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  emptyMessage?: string;
  resultsText?: (count: number, total: number) => string;
  toolbarActions?: ReactNode;
  /** Merged onto the inner `<table>` (e.g. `table-fixed` for dense layouts). */
  tableClassName?: string;
  /**
   * When length matches `columns`, renders `<colgroup><col style="width" /></colgroup>`
   * so widths are honored under `table-fixed` (avoids one column swallowing leftover space).
   */
  columnGroupWidths?: string[];
}

function buildPaginationPages(
  current: number,
  total: number
): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: (number | "ellipsis")[] = [];
  const push = (v: number | "ellipsis") => {
    if (out.length && out[out.length - 1] === v) return;
    out.push(v);
  };
  push(1);
  if (current > 3) push("ellipsis");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    push(p);
  }
  if (current < total - 2) push("ellipsis");
  if (total > 1) push(total);
  return out;
}

export default function DataTable<T>({
  data,
  loading = false,
  columns,
  getRowId,
  renderMainCell,
  renderExpandedContent,
  expandedSections,
  multiExpand = false,
  onRowClick,
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
  toolbarActions,
  tableClassName,
  columnGroupWidths,
}: DataTableProps<T>) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedRowSet, setExpandedRowSet] = useState<Set<string>>(
    () => new Set()
  );
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );

  const [searchTerm, setSearchTerm] = useState("");

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

  const [sortBy, setSortBy] = useState(
    defaultSortBy || sortOptions[0]?.value || ""
  );
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">(defaultSortOrder);

  const onSearchChangeRef = useRef(onSearchChange);
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  });

  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      onSearchChangeRef.current?.(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    if (onFilterChange) {
      onFilterChange(key, value);
    }
  };

  const handleMultiSelectToggle = (filterKey: string, value: string) => {
    let updated: string[] = [];
    setMultiSelectValues((prev) => {
      const current = prev[filterKey] || [];
      updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [filterKey]: updated };
    });
    onFilterChange?.(filterKey, updated);
  };

  const handleMultiSelectClear = (filterKey: string) => {
    setMultiSelectValues((prev) => ({ ...prev, [filterKey]: [] }));
    if (onFilterChange) {
      onFilterChange(filterKey, []);
    }
  };

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
      if (multiExpand) {
        setExpandedRowSet((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else {
        if (expandedRow === id) {
          setExpandedRow(null);
          setExpandedChildren(new Set());
        } else {
          setExpandedRow(id);
          setExpandedChildren(new Set());
        }
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

  const isRowExpanded = (rowId: string) =>
    multiExpand ? expandedRowSet.has(rowId) : expandedRow === rowId;

  const hasToolbarActions = toolbarActions !== undefined && toolbarActions !== null;
  const showToolbar =
    !!onSearchChange ||
    filters.length > 0 ||
    multiSelectFilters.length > 0 ||
    sortOptions.length > 0 ||
    hasToolbarActions;

  const rangeLabel = useMemo(() => {
    if (!pagination || loading || data.length === 0) return null;
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = start + data.length - 1;
    return `${start}–${end} of ${pagination.total}`;
  }, [pagination, loading, data.length, currentPage, itemsPerPage]);

  const pageButtons = useMemo(
    () =>
      pagination && pagination.totalPages > 1
        ? buildPaginationPages(currentPage, pagination.totalPages)
        : [],
    [pagination, currentPage]
  );

  const hasExpandableRow = !!(renderExpandedContent || expandedSections);

  return (
    <div className="space-y-3">
      {showToolbar && (
        <TableToolbarPanel>
          <div className="flex flex-col gap-3">
            {(!!onSearchChange || sortOptions.length > 0 || hasToolbarActions) && (
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                {(!!onSearchChange || sortOptions.length > 0) && (
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    {onSearchChange && (
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={searchPlaceholder}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-9 pl-9 text-sm"
                        />
                      </div>
                    )}
                    {sortOptions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select value={sortBy} onValueChange={handleSortByChange}>
                          <SelectTrigger className="h-9 w-[150px]">
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
                              <ArrowUp className="mr-1 h-4 w-4" />
                              <span className="text-xs">Asc</span>
                            </>
                          ) : (
                            <>
                              <ArrowDown className="mr-1 h-4 w-4" />
                              <span className="text-xs">Desc</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {hasToolbarActions && (
                  <div className="flex flex-wrap items-end gap-2 xl:justify-end">
                    {toolbarActions}
                  </div>
                )}
              </div>
            )}

            {(filters.length > 0 || multiSelectFilters.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <Select
                    key={filter.key}
                    value={filterValues[filter.key]}
                    onValueChange={(value) =>
                      handleFilterChange(filter.key, value)
                    }
                  >
                    <SelectTrigger className="h-9 w-[150px]">
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

                {multiSelectFilters.map((filter) => (
                  <Popover key={filter.key}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-[190px] justify-between text-left font-normal"
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
                    <PopoverContent className="w-[220px] p-0" align="start">
                      <div className="border-b p-2">
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
                      <div className="max-h-[220px] overflow-y-auto p-2">
                        {filter.options.map((option, idx) => (
                          <div
                            key={`${filter.key}-${option.value ?? option.label ?? `idx-${idx}`}`}
                            className="flex cursor-pointer items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-muted"
                            onClick={() =>
                              handleMultiSelectToggle(filter.key, option.value)
                            }
                          >
                            <Checkbox
                              checked={(
                                multiSelectValues[filter.key] || []
                              ).includes(option.value)}
                              onCheckedChange={() =>
                                handleMultiSelectToggle(
                                  filter.key,
                                  option.value
                                )
                              }
                            />
                            <label className="flex-1 cursor-pointer text-sm">
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            )}
          </div>
        </TableToolbarPanel>
      )}

      {pagination && (
        <TableStatusBar>
          {loading ? (
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          ) : (
            <>
              <span>{resultsText(data.length, pagination.total)}</span>
              {rangeLabel ? (
                <span className="text-xs text-muted-foreground/90">
                  ({rangeLabel})
                </span>
              ) : null}
            </>
          )}
        </TableStatusBar>
      )}

      <RawTableSurface>
        <Table className={tableClassName}>
          {columnGroupWidths &&
            columnGroupWidths.length === columns.length && (
              <colgroup>
                {columnGroupWidths.map((w, i) => (
                  <col
                    key={columns[i]?.key ?? `col-${i}`}
                    style={w ? { width: w } : undefined}
                  />
                ))}
              </colgroup>
            )}
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <div className="h-6 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-60" />
                    <p>{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const rowId = getRowId(item);
                const isExpanded = isRowExpanded(rowId);
                const sectionCards = expandedSections?.(item) ?? [];

                return (
                  <Fragment key={rowId}>
                    <TableRow
                      className={cn(
                        "cursor-default border-border text-card-foreground hover:bg-accent/40",
                        isExpanded && "border-b-0 bg-accent/30 hover:bg-accent/40"
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      <TableCell
                        className={cn(
                          columns[0].className,
                          isExpanded && "border-l-2 border-l-primary"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {hasExpandableRow && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(rowId);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-accent"
                              aria-expanded={isExpanded}
                            >
                              <ChevronRight
                                className={cn(
                                  "h-4 w-4 transition-transform duration-200",
                                  isExpanded && "rotate-90"
                                )}
                              />
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

                    {isExpanded &&
                      (renderExpandedContent || sectionCards.length > 0) && (
                        <TableRow className="border-0 hover:bg-transparent">
                          <TableCell
                            colSpan={columns.length}
                            className="border-0 bg-transparent px-3 pb-4 pt-2"
                          >
                            <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
                              {renderExpandedContent ? (
                                <div className="border-b border-border/60 last:border-b-0">
                                  {renderExpandedContent(item)}
                                </div>
                              ) : null}
                              {sectionCards.length > 0 ? (
                                <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
                                  {sectionCards.map((sec, idx) => (
                                    <div
                                      key={`${rowId}-sec-${idx}`}
                                      className="rounded-lg border border-border bg-card p-3 shadow-sm"
                                    >
                                      <div className="mb-2 flex items-center gap-2">
                                        {sec.icon}
                                        <h4 className="font-semibold text-card-foreground">
                                          {sec.title}
                                        </h4>
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {sec.content}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </RawTableSurface>

      {pagination && pagination.totalPages > 1 && !loading && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Page {currentPage} of {pagination.totalPages}
            {rangeLabel ? ` · ${rangeLabel}` : ""}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(1)}
              disabled={currentPage === 1}
            >
              <ChevronFirst className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageButtons.map((p, i) =>
              p === "ellipsis" ? (
                <span
                  key={`e-${i}`}
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              ) : (
                <Button
                  key={p}
                  variant={currentPage === p ? "default" : "outline"}
                  size="sm"
                  className="min-w-[2.25rem]"
                  onClick={() => onPageChange?.(p)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.totalPages)}
              disabled={currentPage === pagination.totalPages}
            >
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** @deprecated Use `DataTable` */
export { DataTable as AdminTable };

export type AdminTableColumn<T> = DataTableColumn<T>;
export type AdminTableFilter = DataTableFilter;
export type AdminTableMultiSelectFilter = DataTableMultiSelectFilter;
export type AdminTableSortOption = DataTableSortOption;
export type AdminTablePaginationMeta = DataTablePaginationMeta;
export type AdminTableExpandedSection = DataTableExpandedSection;
export type AdminTableProps<T> = DataTableProps<T>;
