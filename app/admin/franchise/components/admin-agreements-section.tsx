"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AgreementRecordDetail } from "@/components/agreements/AgreementRecordDetail";
import {
  DataTable,
  type DataTableColumn,
  TableLoadingState,
  TablePageShell,
  TableToolbarPanel,
} from "@/components/shared";
import {
  downloadScheduleBPdfAdmin,
  type AgreementRecord,
} from "@/services/agreement.service";
import {
  ReceivableCompactProgress,
} from "@/components/receivables/InstallmentSummaryCard";
import { getErrorMessage } from "@/lib/error-utils";
import { useAgreementAdmin, useAgreementsAdmin } from "@/hooks/api/agreement.hooks";

function fmtShort(iso: string | null | undefined) {
  if (!iso) return "-";
  try {
    return format(parseISO(iso), "PP");
  } catch {
    return iso;
  }
}

function AdminAgreementViewDialog({
  agreementId,
  open,
  onOpenChange,
}: {
  agreementId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const agreementQuery = useAgreementAdmin(open ? agreementId ?? undefined : undefined);

  useEffect(() => {
    if (agreementQuery.error) {
      toast.error(
        getErrorMessage(agreementQuery.error, "Failed to load agreement"),
      );
    }
  }, [agreementQuery.error]);

  const agreement = agreementQuery.data ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[min(1200px,94vw)]">
        <DialogHeader className="border-b border-border px-4 py-4 text-left sm:px-5">
          <DialogTitle>
            {agreement ? agreement.title || `Agreement #${agreement.id}` : "Agreement details"}
          </DialogTitle>
          <DialogDescription>
            View the agreement without leaving the franchise agreements table.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 sm:p-5">
          {agreementQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading agreement...
            </div>
          ) : agreement ? (
            <AgreementRecordDetail data={agreement} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Agreement not found.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface AdminAgreementsSectionProps {
  fixedFranchiseId?: string;
  embed?: boolean;
}

export function AdminAgreementsSection({
  fixedFranchiseId,
  embed,
}: AdminAgreementsSectionProps = {}) {
  const fixedFilter = fixedFranchiseId?.trim() || undefined;
  const [franchiseFilter, setFranchiseFilter] = useState(
    fixedFranchiseId ?? "",
  );
  const [appliedFilter, setAppliedFilter] = useState<string | undefined>(
    fixedFilter,
  );
  const effectiveFilter = fixedFilter ?? appliedFilter;
  const agreementsQuery = useAgreementsAdmin(effectiveFilter);
  const rows = agreementsQuery.data ?? [];
  const loading = agreementsQuery.isLoading;
  const [viewAgreementId, setViewAgreementId] = useState<number | null>(null);

  useEffect(() => {
    if (agreementsQuery.error) {
      toast.error(getErrorMessage(agreementsQuery.error, "Failed to load agreements"));
    }
  }, [agreementsQuery.error]);

  const columns: DataTableColumn<AgreementRecord>[] = [
    {
      key: "id",
      header: "ID",
      className: "w-16 font-mono text-xs",
      render: (record) => record.id,
    },
    {
      key: "type",
      header: "Type",
      render: (record) => <Badge variant="secondary">{record.type}</Badge>,
    },
    {
      key: "signing",
      header: "Signing",
      className: "text-sm text-muted-foreground whitespace-nowrap",
      render: (record) => fmtShort(record.dateOfSigning),
    },
    {
      key: "signature",
      header: "Signature",
      render: (record) =>
        record.franchiseeSignatureUrl || record.franchiseeSignature ? (
          <Badge variant="outline">Yes</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (record) =>
        record.paymentId != null || record.payment?.id != null ? (
          <Badge variant="outline">Linked</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "emi",
      header: "EMI",
      render: (record) => (
        <ReceivableCompactProgress summary={record.receivables?.installmentSummary} />
      ),
    },
    {
      key: "scheduleB",
      header: "Schedule B",
      className: "w-28",
      render: (record) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
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
          <Download className="mr-1 h-4 w-4" />
          PDF
        </Button>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (record) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setViewAgreementId(record.id)}
        >
          <Eye className="mr-1 h-4 w-4" />
          View
        </Button>
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
      {!fixedFranchiseId?.trim() ? (
        <TableToolbarPanel>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-card-foreground">
              Filter by franchise
            </h2>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-[200px] flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                Franchise ID
              </label>
              <Input
                placeholder="e.g. FR-DEL-001"
                value={franchiseFilter}
                onChange={(event) => setFranchiseFilter(event.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() =>
                setAppliedFilter(
                  franchiseFilter.trim() ? franchiseFilter.trim() : undefined,
                )
              }
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFranchiseFilter("");
                setAppliedFilter(undefined);
              }}
            >
              Clear
            </Button>
          </div>
        </TableToolbarPanel>
      ) : null}

      {loading && rows.length === 0 ? (
        <TableLoadingState message="Loading agreements..." />
      ) : (
        <DataTable<AgreementRecord>
          data={rows}
          loading={loading}
          columns={columns}
          getRowId={(record) => String(record.id)}
          renderMainCell={(record) => (
            <div className="flex flex-col">
              <span className="font-medium">Agreement #{record.id}</span>
              <span className="max-w-[240px] truncate text-sm text-muted-foreground">
                {record.franchise?.name ?? record.franchiseId ?? "-"}
                {record.status ? ` · ${record.status}` : ""}
              </span>
            </div>
          )}
          emptyMessage="No agreements found."
          resultsText={(_count, total) =>
            `${total} agreement${total === 1 ? "" : "s"}${effectiveFilter ? " (filtered)" : ""}`
          }
        />
      )}

      <AdminAgreementViewDialog
        agreementId={viewAgreementId}
        open={viewAgreementId != null}
        onOpenChange={(open) => {
          if (!open) setViewAgreementId(null);
        }}
      />
    </TablePageShell>
  );
}
