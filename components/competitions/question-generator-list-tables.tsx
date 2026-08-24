"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Trash2 } from "lucide-react";
import {
  DataTable,
  RowActionButton,
  StatusBadge,
  TableMainCell,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";

export type QuestionPaperListRow = {
  id: string;
  name: string;
  questionCount: number;
  expectedCount: number;
  sectionCount: number;
  status: "Complete" | "Partial" | "Empty";
  contextLabel: string;
};

export type SectionListRow = {
  id: string;
  name: string;
  questionCount: number;
  expectedCount: number;
  status: "Complete" | "Partial" | "Empty";
};

const STATUS_FILTER: DataTableFilter = {
  key: "status",
  label: "Status",
  options: [
    { value: "all", label: "All statuses" },
    { value: "Complete", label: "Complete" },
    { value: "Partial", label: "Partial" },
    { value: "Empty", label: "Empty" },
  ],
  defaultValue: "all",
};

function filterAndSortRows<T extends { name: string; status: string; questionCount: number }>(
  rows: T[],
  searchTerm: string,
  statusFilter: string,
  sortBy: string,
  sortOrder: "ASC" | "DESC",
  sortKeys: Record<string, (a: T, b: T) => number>,
): T[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  let filtered = rows.filter((row) => {
    const matchesSearch = !normalizedSearch || row.name.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const compare = sortKeys[sortBy] ?? sortKeys.name;
  filtered = [...filtered].sort((a, b) => {
    const result = compare(a, b);
    return sortOrder === "ASC" ? result : -result;
  });

  return filtered;
}

function usePaginatedList<T>(rows: T[], itemsPerPage = 10) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rows.length]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    itemsPerPage,
  };
}

export interface QuestionGeneratorPapersTableProps {
  rows: QuestionPaperListRow[];
  deletingName?: string | null;
  onOpen: (paperName: string) => void;
  onDownload: (paperName: string) => void;
  onDelete: (paperName: string) => void;
  toolbarActions?: ReactNode;
  emptyAction?: ReactNode;
}

export function QuestionGeneratorPapersTable({
  rows,
  deletingName,
  onOpen,
  onDownload,
  onDelete,
  toolbarActions,
  emptyAction,
}: QuestionGeneratorPapersTableProps) {
  const list = usePaginatedList(rows);

  const filteredRows = useMemo(
    () =>
      filterAndSortRows(rows, list.searchTerm, list.statusFilter, list.sortBy, list.sortOrder, {
        name: (a, b) => a.name.localeCompare(b.name),
        progress: (a, b) => a.questionCount - b.questionCount,
        sections: (a, b) => a.sectionCount - b.sectionCount,
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    [rows, list.searchTerm, list.statusFilter, list.sortBy, list.sortOrder],
  );

  const paginatedRows = useMemo(() => {
    const start = (list.currentPage - 1) * list.itemsPerPage;
    return filteredRows.slice(start, start + list.itemsPerPage);
  }, [filteredRows, list.currentPage, list.itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / list.itemsPerPage));

  const columns: DataTableColumn<QuestionPaperListRow>[] = [
    {
      key: "progress",
      header: "Questions",
      className: "w-[140px]",
      render: (row) => (
        <span className="font-mono text-sm tabular-nums">
          {row.expectedCount > 0 ? `${row.questionCount} / ${row.expectedCount}` : row.questionCount}
        </span>
      ),
    },
    {
      key: "sections",
      header: "Sections",
      className: "w-[100px] text-center",
      render: (row) => <span className="tabular-nums">{row.sectionCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      className: "w-[120px] text-center",
      render: (row) => <StatusBadge label={row.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-[100px]",
      render: (row) => (
        <div className="flex items-center justify-end gap-0.5">
          <RowActionButton
            icon={Download}
            label={`Download ${row.name}`}
            disabled={row.questionCount === 0}
            onClick={(event) => {
              event.stopPropagation();
              onDownload(row.name);
            }}
          />
          <RowActionButton
            icon={Trash2}
            label={`Delete ${row.name}`}
            tone="destructive"
            busy={deletingName === row.name}
            disabled={Boolean(deletingName)}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(row.name);
            }}
          />
        </div>
      ),
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "progress", label: "Questions generated" },
    { value: "sections", label: "Section count" },
    { value: "status", label: "Status" },
  ];

  return (
    <div data-testid="question-generator-papers-table">
      <DataTable
        data={paginatedRows}
        columns={columns}
        getRowId={(row) => row.id}
        renderMainCell={(row) => (
          <TableMainCell title={row.name} subtitle={row.contextLabel} separator=" — " />
        )}
        onRowClick={(row) => onOpen(row.name)}
        searchPlaceholder="Search question papers..."
        onSearchChange={list.setSearchTerm}
        filters={[STATUS_FILTER]}
        onFilterChange={(key, value) => {
          if (key === "status") list.setStatusFilter(String(value));
        }}
        sortOptions={sortOptions}
        defaultSortBy="name"
        defaultSortOrder="ASC"
        onSortChange={(nextSortBy, nextSortOrder) => {
          list.setSortBy(nextSortBy);
          list.setSortOrder(nextSortOrder);
        }}
        pagination={{ total: filteredRows.length, totalPages }}
        currentPage={list.currentPage}
        onPageChange={list.setCurrentPage}
        itemsPerPage={list.itemsPerPage}
        toolbarActions={toolbarActions}
        emptyState={{
          title: "No question papers yet",
          hint: "Generate questions from your saved Paper A section rules.",
          action: emptyAction,
        }}
        resultsText={(count, total) => `Showing ${count} of ${total} question papers`}
        tableClassName="table-fixed"
        columnGroupWidths={["140px", "100px", "120px", "100px"]}
      />
    </div>
  );
}

export interface QuestionGeneratorSectionsTableProps {
  rows: SectionListRow[];
  onOpen: (sectionName: string) => void;
  onDelete: (sectionName: string) => void;
}

export function QuestionGeneratorSectionsTable({
  rows,
  onOpen,
  onDelete,
}: QuestionGeneratorSectionsTableProps) {
  const list = usePaginatedList(rows);

  const filteredRows = useMemo(
    () =>
      filterAndSortRows(rows, list.searchTerm, list.statusFilter, list.sortBy, list.sortOrder, {
        name: (a, b) => a.name.localeCompare(b.name),
        progress: (a, b) => a.questionCount - b.questionCount,
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    [rows, list.searchTerm, list.statusFilter, list.sortBy, list.sortOrder],
  );

  const paginatedRows = useMemo(() => {
    const start = (list.currentPage - 1) * list.itemsPerPage;
    return filteredRows.slice(start, start + list.itemsPerPage);
  }, [filteredRows, list.currentPage, list.itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / list.itemsPerPage));

  const columns: DataTableColumn<SectionListRow>[] = [
    {
      key: "progress",
      header: "Questions",
      className: "w-[140px]",
      render: (row) => (
        <span className="font-mono text-sm tabular-nums">
          {row.expectedCount > 0 ? `${row.questionCount} / ${row.expectedCount}` : row.questionCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[120px] text-center",
      render: (row) => <StatusBadge label={row.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-[56px]",
      render: (row) => (
        <RowActionButton
          icon={Trash2}
          label={`Delete ${row.name}`}
          tone="destructive"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(row.name);
          }}
        />
      ),
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Section" },
    { value: "progress", label: "Questions generated" },
    { value: "status", label: "Status" },
  ];

  return (
    <div data-testid="question-generator-sections-table">
      <DataTable
        data={paginatedRows}
        columns={columns}
        getRowId={(row) => row.id}
        renderMainCell={(row) => <TableMainCell title={row.name} />}
        onRowClick={(row) => onOpen(row.name)}
        searchPlaceholder="Search sections..."
        onSearchChange={list.setSearchTerm}
        filters={[STATUS_FILTER]}
        onFilterChange={(key, value) => {
          if (key === "status") list.setStatusFilter(String(value));
        }}
        sortOptions={sortOptions}
        defaultSortBy="name"
        defaultSortOrder="ASC"
        onSortChange={(nextSortBy, nextSortOrder) => {
          list.setSortBy(nextSortBy);
          list.setSortOrder(nextSortOrder);
        }}
        pagination={{ total: filteredRows.length, totalPages }}
        currentPage={list.currentPage}
        onPageChange={list.setCurrentPage}
        itemsPerPage={list.itemsPerPage}
        emptyState={{
          title: "No sections configured",
          hint: "Save section rules for this paper mapping before generating questions.",
        }}
        resultsText={(count, total) => `Showing ${count} of ${total} sections`}
        tableClassName="table-fixed"
        columnGroupWidths={["140px", "120px", "56px"]}
      />
    </div>
  );
}

export function deriveGenerationStatus(
  questionCount: number,
  expectedCount: number,
): QuestionPaperListRow["status"] {
  if (questionCount <= 0) return "Empty";
  if (expectedCount > 0 && questionCount >= expectedCount) return "Complete";
  return "Partial";
}
