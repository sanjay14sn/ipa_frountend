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

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function statusTone(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "inactive":
    case "suspended":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function agreementProgramLabels(item: FranchiseData): string {
  const names = [
    ...(item.agreements ?? []).map((agreement) => agreement.programName),
    item.program?.name,
  ].filter((name): name is string => Boolean(name?.trim()));
  return names.length > 0 ? [...new Set(names)].join(", ") : "—";
}

function requestedPrograms(item: FranchiseData): string[] {
  const names = [
    ...(item.franchisePrograms ?? []).map((entry) => entry.program?.name),
    item.program?.name,
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
          <DetailField label="Franchise ID" value={item.id ?? "—"} />
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
            className: "w-[280px]",
          },
          {
            key: "location",
            header: "Location",
            render: (item) => (
              <span className="text-sm">
                {[item.city, item.state].filter(Boolean).join(", ") || "—"}
              </span>
            ),
          },
          {
            key: "type",
            header: "Type",
            className: "text-center",
            render: (item) => item.type ?? "—",
          },
          {
            key: "programs",
            header: "Programs",
            className: "max-w-[220px] text-center",
            render: (item) => (
              <span className="line-clamp-2 text-sm">
                {agreementProgramLabels(item)}
              </span>
            ),
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
            className: "min-w-[220px]",
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
            key: "createdDate",
            header: "Created",
            className: "text-center",
            render: (item) => formatDate(item.createdAt),
          },
          {
            key: "status",
            header: "Status",
            className: "text-center",
            render: (item) => (
              <Badge className={`${statusTone(item.status)} border text-xs`}>
                {item.status}
              </Badge>
            ),
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
                >
                  <Link href={`/admin/franchise/${item.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
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
            className: "w-[300px]",
          },
          {
            key: "type",
            header: "Type",
            className: "text-center",
            render: (item) => item.type ?? "—",
          },
          {
            key: "programs",
            header: "Program",
            className: "text-center",
            render: (item) => primaryRequestedProgram(item),
          },
          {
            key: "applicationDate",
            header: "Application Date",
            className: "text-center",
            render: (item) => formatDate(item.createdAt),
          },
          {
            key: "status",
            header: "Status",
            className: "text-center",
            render: (item) => (
              <Badge className={`${statusTone(item.status)} border text-xs`}>
                {item.status}
              </Badge>
            ),
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
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onReject?.(item)}
                        className="h-8 w-8 p-0"
                        title="Reject application"
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
      renderMainCell={(item) =>
        variant === "franchises" ? (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">{item.name}</div>
            <div className="text-sm text-gray-500">
              {item.franchisee?.name ? `${item.franchisee.name} · ` : ""}
              {franchiseeMail(item.franchisee)}
              {item.franchisee?.phone ? ` · ${item.franchisee.phone}` : ""}
            </div>
            {(item.agreements?.length ?? 0) > 0 ? (
              <div className="text-xs font-medium text-green-600">
                {item.agreements?.length} agreement
                {item.agreements?.length === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">{item.name}</div>
            <div className="text-sm text-gray-500">
              {item.franchisee?.name ? `${item.franchisee.name} · ` : ""}
              {franchiseeMail(item.franchisee)}
              {item.franchisee?.phone ? ` · ${item.franchisee.phone}` : ""}
            </div>
            <div className="text-xs font-medium text-primary">
              {[item.city, item.state].filter(Boolean).join(", ") ||
                `ID: ${item.id}`}
            </div>
          </div>
        )
      }
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


