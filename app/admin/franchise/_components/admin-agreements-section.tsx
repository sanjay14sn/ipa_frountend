"use client";

import { useMemo, useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
  StatusBadge,
  TablePageShell,
  formatStatusLabel,
} from "@/components/shared";
import {
  downloadScheduleBPdfAdmin,
  type AgreementKind,
  type AgreementRecord,
  type AgreementStatus,
} from "@/services/agreement.service";
import { formatDate } from "@/lib/date-utils";
import { agreementTypeBadgeClass, agreementTypeLabel } from "@/lib/payment-details-display";
import {
  ReceivableCompactProgress,
} from "@/components/receivables/InstallmentSummaryCard";
import { getErrorMessage } from "@/lib/error-utils";
import { useAgreementsAdmin } from "@/hooks/api/agreement.hooks";
import { useAgreementIdFromUrl } from "@/hooks/use-agreement-id-from-url";
import { AdminAgreementDetailSheet } from "./AdminAgreementDetailSheet";
import { AgreementRowActions } from "./AgreementRowActions";

export interface AdminAgreementsSectionProps {
  fixedFranchiseId?: string;
  embed?: boolean;
}

export function AdminAgreementsSection({
  fixedFranchiseId,
  embed,
}: AdminAgreementsSectionProps = {}) {
  const fixedFilter = fixedFranchiseId?.trim() || undefined;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const listParams = useMemo(
    () => ({
      search: searchTerm || undefined,
      status:
        statusFilter !== "all" ? (statusFilter as AgreementStatus) : undefined,
      type: typeFilter !== "all" ? (typeFilter as AgreementKind) : undefined,
      sortBy: sortBy || undefined,
      sortOrder,
    }),
    [searchTerm, statusFilter, typeFilter, sortBy, sortOrder],
  );

  const agreementsQuery = useAgreementsAdmin(fixedFilter, listParams);
  const rows = agreementsQuery.data ?? [];
  const loading = agreementsQuery.isLoading;
  const [agreementId, setAgreementId] = useAgreementIdFromUrl();

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "DRAFT", label: "Draft" },
        { value: "APPROVED", label: "Approved" },
        { value: "ACTIVE", label: "Active" },
        { value: "SUSPENDED", label: "Suspended" },
        { value: "EXPIRED", label: "Expired" },
        { value: "SUPERSEDED", label: "Superseded" },
        { value: "VOID", label: "Void" },
      ],
      defaultValue: "all",
    },
    {
      // Server-side this filters on the agreement `kind` (param name kept as
      // `type`); renewal-vs-new is the `origin` column shown in the Type badge.
      key: "type",
      label: "Kind",
      options: [
        { value: "all", label: "All kinds" },
        { value: "FRANCHISE", label: agreementTypeLabel("FRANCHISE") },
        { value: "PROGRAM", label: agreementTypeLabel("PROGRAM") },
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "title", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  const columns: DataTableColumn<AgreementRecord>[] = [
    {
      key: "agreement",
      header: "Agreement",
    },
    {
      key: "type",
      header: "Type",
      render: (record) => (
        <Badge
          variant="outline"
          className={agreementTypeBadgeClass(record.kind, record.origin)}
        >
          {agreementTypeLabel(record.kind, record.origin)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (record) => (
        <StatusBadge label={formatStatusLabel(record.status ?? "Unknown")} />
      ),
    },
    {
      key: "signed",
      header: "Signed",
      render: (record) => {
        const signedAt = record.franchiseeSignedAt ?? record.dateOfSigning;
        return record.signed ? (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Check className="h-4 w-4 shrink-0 text-success" />
            {signedAt ? formatDate(signedAt) : "—"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <X className="h-4 w-4 shrink-0" />
            Not signed
          </span>
        );
      },
    },
    {
      key: "validity",
      header: "Validity",
      render: (record) => (
        <span className="text-xs text-muted-foreground">
          {record.tenure != null ? `${record.tenure}mo` : "—"}
          {record.expiresAt ? ` · exp ${formatDate(record.expiresAt)}` : ""}
        </span>
      ),
    },
    {
      key: "emi",
      header: "EMI",
      className: "min-w-[180px]",
      render: (record) => (
        <ReceivableCompactProgress summary={record.receivables?.installmentSummary} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[110px] text-center",
      render: (record) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            title="View agreement"
            aria-label="View agreement"
            onClick={() => setAgreementId(record.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <AgreementRowActions
            agreement={record}
            onDownloadScheduleB={async () => {
              try {
                await downloadScheduleBPdfAdmin(record.id);
                toast.success("Schedule B PDF download started");
              } catch (error) {
                toast.error(
                  getErrorMessage(error, "Failed to download Schedule B PDF"),
                );
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <TablePageShell
      embed={embed}
      title={!embed ? "Agreements" : undefined}
      description={
        !embed
          ? "Franchise agreements: signatures, programs, and payment links."
          : undefined
      }
    >
      <DataTable<AgreementRecord>
        data={rows}
        loading={loading}
        columns={columns}
        getRowId={(record) => String(record.id)}
        renderMainCell={(record) => (
          // Capped + truncated so long franchise/program names can't force a
          // horizontal scroll; full text in the hover title.
          <div
            className="max-w-[230px] truncate font-medium"
            title={`${record.franchise?.name ?? "—"} - ${record.program?.name ?? record.programName ?? "—"}`}
          >
            {record.franchise?.name ?? "—"}
            <span className="mx-1 text-muted-foreground">-</span>
            {record.program?.name ?? record.programName ?? "—"}
          </div>
        )}
        searchPlaceholder="Search agreements by title..."
        onSearchChange={(value) => setSearchTerm(value)}
        filters={filters}
        onFilterChange={(key, value) => {
          if (key === "status") setStatusFilter(value as string);
          if (key === "type") setTypeFilter(value as string);
        }}
        sortOptions={sortOptions}
        defaultSortBy={sortBy}
        defaultSortOrder={sortOrder}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
        error={agreementsQuery.error}
        onRetry={() => void agreementsQuery.refetch()}
        errorMessage="Couldn't load agreements."
        emptyState={{
          title: "No agreements found",
          hint: "Agreements appear here once a franchise application or program request is approved.",
        }}
      />

      <AdminAgreementDetailSheet
        agreementId={agreementId}
        open={agreementId != null}
        onOpenChange={(open) => {
          if (!open) setAgreementId(null);
        }}
      />
    </TablePageShell>
  );
}
