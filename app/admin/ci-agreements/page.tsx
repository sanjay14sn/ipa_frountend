"use client";

import { Suspense, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Check, X, Eye, History } from "lucide-react";
import { AdminCIAgreementDialog } from "@/components/agreements/AdminCIAgreementDialog";
import {
  DataTable,
  type DataTableColumn,
  TableLoadingState,
  TablePageShell,
} from "@/components/shared";
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
  renewCIAgreement,
  type CIAgreementAdminRow,
} from "@/services/contracting.service";
import { getErrorMessage } from "@/lib/error-utils";

type Action = "suspend" | "void";

interface ActionDialogState {
  action: Action;
  agreementId: number;
  title: string;
}

type BadgeTone = "default" | "secondary" | "outline" | "destructive";

/** Maps a CI agreement status to a display label + badge tone. */
function statusBadge(status: string): { label: string; tone: BadgeTone } {
  switch (status) {
    case "Valid":
      return { label: "Valid", tone: "default" };
    case "Suspended":
      return { label: "Suspended", tone: "secondary" };
    case "Expired":
      return { label: "Expired", tone: "destructive" };
    case "Void":
      return { label: "Void", tone: "outline" };
    case "Approved":
      return { label: "Pending signature", tone: "secondary" };
    default:
      return { label: status, tone: "outline" };
  }
}

/** One entry of metadata.renewals, recorded by the backend on each renewal. */
interface RenewalEntry {
  at?: string;
  effectiveDate?: string;
  oldExpiresAt?: string | null;
  oldTenure?: number | null;
  newTenure?: number;
  newExpiresAt?: string;
  by?: number | null;
}

function getRenewals(metadata?: Record<string, unknown> | null): RenewalEntry[] {
  const raw = metadata?.renewals;
  return Array.isArray(raw) ? (raw as RenewalEntry[]) : [];
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function RenewalHistoryDialog({
  agreement,
  onClose,
}: {
  agreement: { title: string; renewals: RenewalEntry[] };
  onClose: () => void;
}) {
  // Newest first.
  const renewals = agreement.renewals.slice().reverse();
  return (
    <AppDialog open onOpenChange={(open) => { if (!open) onClose(); }} size="md">
      <AppDialogHeader
        title="Renewal history"
        description={`${agreement.title} · ${renewals.length} renewal${renewals.length === 1 ? "" : "s"}`}
      />
      <AppDialogBody>
        {renewals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No renewals recorded for this agreement.</p>
        ) : (
          <ol className="space-y-3">
            {renewals.map((r, i) => (
              <li key={i} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    Renewal #{renewals.length - i}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.at)}</span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Effective from</dt>
                    <dd className="font-medium">{fmtDate(r.effectiveDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tenure</dt>
                    <dd className="font-medium">
                      {r.oldTenure != null ? `${r.oldTenure}mo → ` : ""}
                      {r.newTenure != null ? `${r.newTenure}mo` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Previous expiry</dt>
                    <dd className="font-medium">{fmtDate(r.oldExpiresAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">New expiry</dt>
                    <dd className="font-medium">{fmtDate(r.newExpiresAt)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </AppDialogBody>
      <AppDialogFooter primary={{ label: "Close", onClick: onClose }} />
    </AppDialog>
  );
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

function RenewDialog({
  agreement,
  onClose,
  onSuccess,
}: {
  agreement: { id: number; title: string };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tenure, setTenure] = useState("12");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [loading, setLoading] = useState(false);

  const tenureNum = Number(tenure);
  const valid =
    Number.isInteger(tenureNum) && tenureNum >= 1 && effectiveDate !== "";

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await renewCIAgreement(agreement.id, { tenure: tenureNum, effectiveDate });
      toast.success("Agreement renewed");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to renew agreement"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppDialog open onOpenChange={(open) => { if (!open) onClose(); }} size="sm">
      <AppDialogHeader
        title="Renew agreement"
        description={`Extend "${agreement.title}" with a new tenure. No re-signing required.`}
      />
      <AppDialogBody>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenure">Tenure (months)</Label>
            <Input
              id="tenure"
              type="number"
              min={1}
              step={1}
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Effective from</Label>
            <DateInput
              id="effectiveDate"
              value={effectiveDate}
              onChange={setEffectiveDate}
            />
            <p className="text-xs text-muted-foreground">
              New expiry = effective date + tenure months.
            </p>
          </div>
        </div>
      </AppDialogBody>
      <AppDialogFooter
        secondary={{ label: "Cancel", onClick: onClose, disabled: loading }}
        primary={{
          label: loading ? "Processing..." : "Renew",
          onClick: handleSubmit,
          loading,
          disabled: !valid,
        }}
      />
    </AppDialog>
  );
}

function CIAgreementsTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);
  const [renewAgreement, setRenewAgreement] = useState<{ id: number; title: string } | null>(null);
  const [historyAgreement, setHistoryAgreement] = useState<{ title: string; renewals: RenewalEntry[] } | null>(null);
  const [reactivatingId, setReactivatingId] = useState<number | null>(null);
  const [viewInstructor, setViewInstructor] = useState<{ id: number; name?: string } | null>(null);

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
      key: "agreement",
      header: "Agreement",
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
      key: "status",
      header: "Status",
      render: (row) => {
        const badge = statusBadge(row.status);
        const renewals = getRenewals(row.metadata);
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={badge.tone}>{badge.label}</Badge>
            {renewals.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                Renewed ×{renewals.length}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "validity",
      header: "Validity",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.tenure != null ? `${row.tenure}mo` : "—"}
          {row.expiresAt ? ` · exp ${row.expiresAt.slice(0, 10)}` : ""}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[200px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.courseInstructorId != null && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() =>
                setViewInstructor({ id: row.courseInstructorId!, name: row.ciName })
              }
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          {getRenewals(row.metadata).length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              title="Renewal history"
              onClick={() =>
                setHistoryAgreement({ title: row.title, renewals: getRenewals(row.metadata) })
              }
            >
              <History className="h-3.5 w-3.5" />
            </Button>
          )}
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
          {row.status === "Expired" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setRenewAgreement({ id: row.id, title: row.title })}
            >
              Renew
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
              {row.ciName ?? "—"} - {row.franchiseName ?? "—"}
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

      {renewAgreement && (
        <RenewDialog
          agreement={renewAgreement}
          onClose={() => setRenewAgreement(null)}
          onSuccess={invalidate}
        />
      )}

      {historyAgreement && (
        <RenewalHistoryDialog
          agreement={historyAgreement}
          onClose={() => setHistoryAgreement(null)}
        />
      )}

      <AdminCIAgreementDialog
        instructor={viewInstructor}
        onClose={() => setViewInstructor(null)}
      />
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
