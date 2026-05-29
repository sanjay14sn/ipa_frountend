"use client";

import { useEffect, useState } from "react";
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
  type ReceivableSummaryItem,
} from "@/services/agreement.service";
import {
  ReceivableCompactProgress,
} from "@/components/receivables/InstallmentSummaryCard";
import { getErrorMessage } from "@/lib/error-utils";
import {
  useAgreementAdmin,
  useAgreementsAdmin,
  useWaiveReceivableItemMutation,
} from "@/hooks/api/agreement.hooks";
import { WaiveReceivableDialog } from "./WaiveReceivableDialog";

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
  const [waiveItem, setWaiveItem] = useState<ReceivableSummaryItem | null>(null);
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
  const waiveMutation = useWaiveReceivableItemMutation(agreementId ?? 0);

  useEffect(() => {
    if (agreementQuery.error) {
      toast.error(
        getErrorMessage(agreementQuery.error, "Failed to load agreement"),
      );
    }
  }, [agreementQuery.error]);

  const agreement = agreementQuery.data ?? null;

  const handleWaiveSubmit = async (itemId: number, reason: string) => {
    try {
      await waiveMutation.mutateAsync({ itemId, reason });
      toast.success("Receivable waived successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to waive receivable"));
      throw error;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[min(1200px,94vw)]">
          <DialogHeader className="border-b border-border px-4 py-4 text-left sm:px-5">
            <DialogTitle>
              {(() => {
                const cleaned = (agreement?.title ?? "")
                  .replace(/\s+\S*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\S*$/i, "")
                  .replace(/\s+#?\d+\s*$/, "")
                  .trim();
                return cleaned || "Franchise Agreement";
              })()}
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
              <AgreementRecordDetail
                data={agreement}
                onWaiveItem={(item) => {
                  setWaiveItem(item);
                  setWaiveDialogOpen(true);
                }}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Agreement not found.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <WaiveReceivableDialog
        item={waiveItem}
        open={waiveDialogOpen}
        onOpenChange={setWaiveDialogOpen}
        onSubmit={handleWaiveSubmit}
        isSubmitting={waiveMutation.isPending}
      />
    </>
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
      key: "agreement",
      header: "Agreement",
    },
    {
      key: "type",
      header: "Type",
      render: (record) => <Badge variant="secondary">{record.type}</Badge>,
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
      className: "w-[140px] text-center",
      render: (record) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            title="View agreement"
            aria-label="View agreement"
            onClick={() => setViewAgreementId(record.id)}
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
            <span className="font-medium">
              Agreement #{record.id}
              <span className="ml-2 text-xs text-muted-foreground">
                · {record.franchise?.name ?? record.franchiseId ?? "-"}
              </span>
            </span>
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
