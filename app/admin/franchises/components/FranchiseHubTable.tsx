"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DataTable,
  DetailCard,
  DetailField,
  DetailFieldsGrid,
  DetailMessage,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableMultiSelectFilter,
  type DataTablePaginationMeta,
  type DataTableSortOption,
} from "@/components/shared";
import type { FranchiseData } from "@/services/franchisee.service";
import { Edit, Eye, Trash2, Check, X } from "lucide-react";
import { FranchiseTableExpanded } from "./FranchiseTableExpanded";
import { ReceivableCompactLine } from "@/components/receivables/InstallmentSummaryCard";
import { formatDate } from "@/lib/date-utils";

type FranchiseHubVariant = "franchises" | "applications";

interface FranchiseHubTableProps {
  variant: FranchiseHubVariant;
  data: FranchiseData[];
  loading?: boolean;
  pagination: DataTablePaginationMeta;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  filters?: DataTableFilter[];
  multiSelectFilters?: DataTableMultiSelectFilter[];
  onFilterChange?: (key: string, value: string | string[]) => void;
  sortOptions?: DataTableSortOption[];
  defaultSortBy?: string;
  defaultSortOrder?: "ASC" | "DESC";
  onSortChange?: (sortBy: string, sortOrder: "ASC" | "DESC") => void;
  emptyMessage: string;
  resultsText?: (count: number, total: number) => string;
  onApprove?: (application: FranchiseData) => void;
  onReject?: (application: FranchiseData) => void;
  disableApproveActions?: boolean;
}

function franchiseeMail(fe: FranchiseData["franchisee"]): string {
  if (!fe) return "—";
  const raw = fe as FranchiseData["franchisee"] & { email?: string };
  return raw.mail || raw.email || "—";
}

function requestedPrograms(item: FranchiseData): string[] {
  const names = [
    ...(item.agreements ?? []).map((a) => a.programName ?? a.program?.name),
  ].filter((name): name is string => Boolean(name?.trim()));
  return [...new Set(names)];
}

function primaryRequestedProgram(item: FranchiseData): string {
  return requestedPrograms(item)[0] ?? "N/A";
}

function ApplicationsExpanded({ item }: { item: FranchiseData }) {
  const fe = item.franchisee;
  const programs = requestedPrograms(item);
  const location = [item.city, item.state].filter(Boolean).join(", ") || "—";

  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Franchisee information">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Name" value={fe?.name ?? "—"} />
          <DetailField label="Email" value={franchiseeMail(fe)} />
          <DetailField label="Phone" value={fe?.phone ?? "—"} />
          <DetailField label="Date of birth" value={formatDate(fe?.dob)} />
          <DetailField label="Blood group" value={fe?.bloodGroup ?? "—"} />
          <DetailField
            label="Communication address"
            value={fe?.communicationAddress ?? "—"}
            span={3}
          />
          <DetailField label="Education" value={fe?.education ?? "—"} />
          <DetailField label="Occupation" value={fe?.occupation ?? "—"} />
          <DetailField label="Reference" value={fe?.reference ?? "—"} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Application overview">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Application name" value={item.name ?? "—"} />
          <DetailField label="Type" value={item.type ?? "—"} />
          <DetailField label="Review status" value={item.status ?? "—"} />
          <DetailField label="Location" value={location} />
          <DetailField label="Application date" value={formatDate(item.createdAt)} />
          <DetailField label="Last updated" value={formatDate(item.updatedAt)} />
          <DetailField label="Franchise Code" value={item.code ?? "—"} />
          <DetailField label="Address" value={item.address ?? "—"} span={2} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection
        title="Program / approval context"
        description="Agreement terms are created during the approval flow, then sent for signature."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailCard
            title="Requested programs"
            meta={`${programs.length || 0} selected`}
          >
            {programs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {programs.map((program) => (
                  <Badge key={program} variant="secondary">
                    {program}
                  </Badge>
                ))}
              </div>
            ) : (
              <DetailMessage>No program request is attached to this application yet.</DetailMessage>
            )}
          </DetailCard>

          <DetailCard title="Approval note">
            <DetailFieldsGrid columns={2}>
              <DetailField
                label="Program used for approval"
                value={primaryRequestedProgram(item)}
              />
              <DetailField
                label="Agreement terms"
                value="Created when the admin approves the application"
              />
              <DetailField
                label="Signature flow"
                value="Triggered after terms are saved"
              />
              <DetailField
                label="Current application state"
                value={item.status ?? "Pending"}
              />
            </DetailFieldsGrid>
          </DetailCard>
        </div>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}

export function FranchiseHubTable({
  variant,
  data,
  loading = false,
  pagination,
  currentPage,
  onPageChange,
  itemsPerPage,
  searchPlaceholder,
  onSearchChange,
  filters = [],
  multiSelectFilters = [],
  onFilterChange,
  sortOptions = [],
  defaultSortBy,
  defaultSortOrder = "DESC",
  onSortChange,
  emptyMessage,
  resultsText,
  onApprove,
  onReject,
  disableApproveActions,
}: FranchiseHubTableProps) {
  const columns: DataTableColumn<FranchiseData>[] =
    variant === "franchises"
      ? [
          {
            key: "franchise",
            header: "Franchise",
            className: "w-[260px]",
          },
          {
            key: "location",
            header: "Location",
            render: (item) =>
              [item.city, item.state].filter(Boolean).join(", ") || "—",
          },
          {
            key: "type",
            header: "Type",
            className: "text-center",
            render: (item) => item.type ?? "—",
          },
          {
            key: "agreements",
            header: "Agreements",
            className: "text-center",
            render: (item) => item.agreements?.length ?? 0,
          },
          {
            key: "emi",
            header: "EMI",
            className: "min-w-[200px]",
            render: (item) => (
              <ReceivableCompactLine
                summary={
                  item.agreements?.find(
                    (agreement) => agreement.receivables?.installmentSummary,
                  )?.receivables?.installmentSummary
                }
              />
            ),
          },
          {
            key: "status",
            header: "Status",
            className: "text-center",
            render: (item) => <StatusBadge label={item.status} />,
          },
          {
            key: "actions",
            header: "Actions",
            className: "text-center",
            render: (item) => (
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  title="View franchise hub"
                  aria-label="View franchise hub"
                >
                  <Link href={`/admin/franchise/${item.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" aria-label="Edit franchise">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Delete franchise">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]
      : [
          {
            key: "application",
            header: "Application",
            className: "w-[280px]",
          },
          {
            key: "type",
            header: "Type",
            className: "text-center",
            render: (item) => item.type ?? "—",
          },
          {
            key: "status",
            header: "Status",
            className: "text-center",
            render: (item) => <StatusBadge label={item.status} />,
          },
          {
            key: "actions",
            header: "Actions",
            className: "text-center",
            render: (item) => {
              const canReview = item.status === "Pending";
              return (
                <div className="flex items-center justify-center gap-1">
                  {canReview ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onApprove?.(item)}
                        disabled={disableApproveActions}
                        className="h-8 w-8 p-0"
                        title="Approve application"
                        aria-label="Approve application"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onReject?.(item)}
                        className="h-8 w-8 p-0"
                        title="Reject application"
                        aria-label="Reject application"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">No actions</span>
                  )}
                </div>
              );
            },
          },
        ];

  return (
    <DataTable
      data={data}
      loading={loading}
      columns={columns}
      getRowId={(item) => String(item.id)}
      renderMainCell={(item) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-gray-900">{item.name}</span>
          {item.code && (
            <span className="text-xs text-muted-foreground font-mono">{item.code}</span>
          )}
        </div>
      )}
      renderExpandedContent={(item) =>
        variant === "franchises" ? (
          <FranchiseTableExpanded item={item} />
        ) : (
          <ApplicationsExpanded item={item} />
        )
      }
      searchPlaceholder={searchPlaceholder}
      onSearchChange={onSearchChange}
      filters={filters}
      multiSelectFilters={multiSelectFilters}
      onFilterChange={onFilterChange}
      sortOptions={sortOptions}
      defaultSortBy={defaultSortBy}
      defaultSortOrder={defaultSortOrder}
      onSortChange={onSortChange}
      pagination={pagination}
      currentPage={currentPage}
      onPageChange={onPageChange}
      itemsPerPage={itemsPerPage}
      emptyMessage={emptyMessage}
      resultsText={resultsText}
    />
  );
}


