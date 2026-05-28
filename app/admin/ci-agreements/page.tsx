"use client";

import { Suspense, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
  TableLoadingState,
  TablePageShell,
} from "@/components/shared";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
  AppDialogFooter,
} from "@/components/shared/dialog";
import {
  listCIAgreementsForAdmin,
  suspendCIAgreement,
  reactivateCIAgreement,
  voidCIAgreement,
  type CIAgreementAdminRow,
} from "@/services/contracting.service";
import { getErrorMessage } from "@/lib/error-utils";

type Action = "suspend" | "void";

interface ActionDialogState {
  action: Action;
  agreementId: number;
  title: string;
}

function ActionDialog({
  state,
  onClose,
  onSuccess,
}: {
  state: ActionDialogState;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (state.action === "suspend") {
        await suspendCIAgreement(state.agreementId, reason || undefined);
        toast.success("Agreement suspended");
      } else {
        await voidCIAgreement(state.agreementId, reason || undefined);
        toast.success("Agreement voided");
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${state.action} agreement`));
    } finally {
      setLoading(false);
    }
  };

  const label = state.action === "suspend" ? "Suspend" : "Void";
  const isDestructive = state.action === "void";

  return (
    <AppDialog open onOpenChange={(open) => { if (!open) onClose(); }} size="sm">
      <AppDialogHeader
        title={`${label} agreement`}
        description={`${label} "${state.title}"`}
      />
      <AppDialogBody>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Textarea
            id="reason"
            placeholder={`Reason for ${state.action.toLowerCase()}ing...`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
      </AppDialogBody>
      <AppDialogFooter
        secondary={{ label: "Cancel", onClick: onClose, disabled: loading }}
        primary={{
          label: loading ? "Processing..." : label,
          onClick: handleSubmit,
          loading,
          variant: isDestructive ? "destructive" : "default",
        }}
      />
    </AppDialog>
  );
}

function statusTone(status: string) {
  if (status === "Valid") return "success" as const;
  if (status === "Approved") return "warning" as const;
  if (status === "Suspended") return "destructive" as const;
  if (status === "Void") return "neutral" as const;
  return undefined;
}

function CIAgreementsTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);
  const [reactivatingId, setReactivatingId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ["ci-agreements", "admin", page],
    queryFn: () => listCIAgreementsForAdmin({ page, limit: 20 }),
  });

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const limit = query.data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const loading = query.isLoading;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ci-agreements", "admin"] });
  };

  const handleReactivate = async (row: CIAgreementAdminRow) => {
    setReactivatingId(row.id);
    try {
      await reactivateCIAgreement(row.id);
      toast.success("Agreement reactivated");
      invalidate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to reactivate agreement"));
    } finally {
      setReactivatingId(null);
    }
  };

  const columns: DataTableColumn<CIAgreementAdminRow>[] = [
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: "signatures",
      header: "Signed",
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span title="CI signed">
            CI {row.ciSigned ? <Check className="inline h-3 w-3 text-emerald-600" /> : <X className="inline h-3 w-3 text-red-400" />}
          </span>
          <span className="mx-1">·</span>
          <span title="Franchisee signed">
            Fr {row.franchiseeSigned ? <Check className="inline h-3 w-3 text-emerald-600" /> : <X className="inline h-3 w-3 text-red-400" />}
          </span>
        </div>
      ),
    },
    {
      key: "instructor",
      header: "Instructor",
      render: (row) => (
        <span className="text-sm">{row.instructorName ?? "—"}</span>
      ),
    },
    {
      key: "centre",
      header: "Centre",
      render: (row) => (
        <span className="text-sm">{row.centreName ?? row.franchiseName ?? "—"}</span>
      ),
    },
    {
      key: "validity",
      header: "Validity",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.validFrom ?? "—"} → {row.validUntil ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[200px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === "Valid" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() =>
                setActionDialog({ action: "suspend", agreementId: row.id, title: row.title })
              }
            >
              Suspend
            </Button>
          )}
          {row.status === "Suspended" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={reactivatingId === row.id}
              onClick={() => handleReactivate(row)}
            >
              {reactivatingId === row.id ? "..." : "Reactivate"}
            </Button>
          )}
          {row.status !== "Void" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() =>
                setActionDialog({ action: "void", agreementId: row.id, title: row.title })
              }
            >
              Void
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {loading && rows.length === 0 ? (
        <TableLoadingState message="Loading CI agreements..." />
      ) : (
        <DataTable<CIAgreementAdminRow>
          data={rows}
          loading={loading}
          columns={columns}
          getRowId={(row) => String(row.id)}
          renderMainCell={(row) => (
            <span className="font-medium">
              {row.title}
            </span>
          )}
          emptyMessage="No CI agreements found."
          resultsText={(_count, t) => `${t} agreement${t === 1 ? "" : "s"}`}
          pagination={totalPages > 1 ? { total, totalPages } : undefined}
          onPageChange={setPage}
        />
      )}

      {actionDialog && (
        <ActionDialog
          state={actionDialog}
          onClose={() => setActionDialog(null)}
          onSuccess={invalidate}
        />
      )}
    </div>
  );
}

function AdminCIAgreementsPageInner() {
  return (
    <TablePageShell
      title="CI Agreements"
      description="Course instructor agreements: lifecycle management and status controls."
    >
      <CIAgreementsTable />
    </TablePageShell>
  );
}

export default function AdminCIAgreementsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <AdminCIAgreementsPageInner />
    </Suspense>
  );
}
