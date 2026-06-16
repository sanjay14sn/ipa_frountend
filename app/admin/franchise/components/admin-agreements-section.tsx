"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IssueRenewalButton } from "@/components/agreements/IssueRenewalButton";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
  TablePageShell,
} from "@/components/shared";
import {
  downloadScheduleBPdfAdmin,
  type AgreementRecord,
} from "@/services/agreement.service";
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
      status: statusFilter !== "all" ? statusFilter : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
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
        { value: "Draft", label: "Draft" },
        { value: "Approved", label: "Approved" },
        { value: "Valid", label: "Valid" },
        { value: "Suspended", label: "Suspended" },
        { value: "Void", label: "Void" },
        { value: "Expired", label: "Expired" },
      ],
      defaultValue: "all",
    },
    {
      key: "type",
      label: "Type",
      options: [
        { value: "all", label: "All types" },
        { value: "NEW_FRANCHISE", label: agreementTypeLabel("NEW_FRANCHISE") },
        { value: "NEW_PROGRAM", label: agreementTypeLabel("NEW_PROGRAM") },
        { value: "RENEWAL", label: agreementTypeLabel("RENEWAL") },
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "title", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  useEffect(() => {
    if (agreementsQuery.error) {
      toast.error(getErrorMessage(agreementsQuery.error, "Failed to load agreements"));
    }
  }, [agreementsQuery.error]);

  const columns: DataTableColumn<AgreementRecord>[] = [
    {
      key: "agreement",
      header: "Agreement",
    },
    {
      key: "type",
      header: "Type",
      render: (record) => (
        <Badge variant="outline" className={agreementTypeBadgeClass(record.type)}>
          {agreementTypeLabel(record.type)}
        </Badge>
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
      className: "w-[200px] text-center",
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            title="Download Schedule B PDF"
            aria-label="Download Schedule B PDF"
            onClick={async () => {
              try {
                await downloadScheduleBPdfAdmin(record.id);
                toast.success("Schedule B PDF download started");
              } catch (error) {
                toast.error(
                  getErrorMessage(error, "Failed to download Schedule B PDF"),
                );
              }
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
          <AgreementRowActions agreement={record} />
          <IssueRenewalButton agreement={record} />
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
          <span className="font-medium">
            {record.franchise?.name ?? record.franchiseId ?? "—"}
            <span className="mx-1 text-muted-foreground">-</span>
            {record.program?.name ?? record.programName ?? "—"}
          </span>
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
        emptyMessage="No agreements found."
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
