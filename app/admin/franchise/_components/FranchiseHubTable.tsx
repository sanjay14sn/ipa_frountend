"use client";

import type { ReactNode } from "react";
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
  TableMainCell,
} from "@/components/shared";
import type { FranchiseData } from "@/services/franchisee.service";
import {
  Eye,
  KeyRound,
  Check,
  X,
  PencilLine,
  Trash2,
  UserPen,
} from "lucide-react";
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
  toolbarActions?: ReactNode;
  emptyMessage: string;
  resultsText?: (count: number, total: number) => string;
  onApprove?: (application: FranchiseData) => void;
  onReject?: (application: FranchiseData) => void;
  onResendCredentials?: (franchise: FranchiseData) => void;
  onEditFranchise?: (franchise: FranchiseData) => void;
  onEditFranchisee?: (franchise: FranchiseData) => void;
  /** Superadmin hard delete; pass only when the viewer may delete. */
  onDeleteFranchise?: (franchise: FranchiseData) => void;
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

function primaryRequestedProgram(item: FranchiseData): string | undefined {
  return requestedPrograms(item)[0];
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
          <DetailField
            label="Communication address"
            value={fe?.communicationAddress ?? "—"}
            span={2}
          />
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
  toolbarActions,
  emptyMessage,
  resultsText,
  onApprove,
  onReject,
  onResendCredentials,
  onEditFranchise,
  onEditFranchisee,
  onDeleteFranchise,
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
            render: (item) => {
              // Operational standing is derived from agreements now — show the
              // count of valid agreements instead of a stored "Active" status.
              const validCount = item.validAgreementsCount ?? 0;
              return (
                <span
                  title={`${validCount} valid agreement${validCount === 1 ? "" : "s"}`}
                >
                  <StatusBadge
                    label={`${validCount} valid`}
                    tone={validCount > 0 ? "success" : "neutral"}
                  />
                </span>
              );
            },
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
                {onEditFranchise ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditFranchise(item)}
                    title="Edit franchise details"
                    aria-label="Edit franchise details"
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                ) : null}
                {onEditFranchisee && item.franchisee?.id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditFranchisee(item)}
                    title="Edit franchisee details"
                    aria-label="Edit franchisee details"
                  >
                    <UserPen className="h-4 w-4" />
                  </Button>
                ) : null}
                {onResendCredentials ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResendCredentials(item)}
                    title="Resend franchisee credentials"
                    aria-label="Resend franchisee credentials"
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                ) : null}
                {onDeleteFranchise ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDeleteFranchise(item)}
                    title="Delete franchise"
                    aria-label="Delete franchise"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
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
                      {onReject ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onReject(item)}
                          className="h-8 w-8 p-0"
                          title="Reject application"
                          aria-label="Reject application"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {onDeleteFranchise ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDeleteFranchise(item)}
                      title="Delete application"
                      aria-label="Delete application"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {!canReview && !onDeleteFranchise ? (
                    <span className="text-xs text-muted-foreground">No actions</span>
                  ) : null}
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
        // Capped + truncated so long names can't inflate the column into a
        // horizontal scroll; the full name is in the hover title.
        <div className="max-w-[230px] truncate" title={item.name}>
          <TableMainCell
            title={item.name}
            subtitle={
              item.code ? <span className="font-mono">{item.code}</span> : undefined
            }
          />
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
      toolbarActions={toolbarActions}
      pagination={pagination}
      currentPage={currentPage}
      onPageChange={onPageChange}
      itemsPerPage={itemsPerPage}
      emptyMessage={emptyMessage}
      resultsText={resultsText}
    />
  );
}


