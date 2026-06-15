"use client";

import { useState } from "react";
import {
  Ban,
  Download,
  Loader2,
  Package,
  PackageOpen,
  PauseCircle,
  PlayCircle,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  downloadScheduleBPdfAdmin,
  type AgreementRecord,
} from "@/services/agreement.service";
import { getErrorMessage } from "@/lib/error-utils";
import {
  useDispatchFranchiseKitMutation,
  useReactivateAgreementMutation,
  useSuspendAgreementMutation,
  useVoidAgreementMutation,
} from "@/hooks/api/agreement.hooks";
import {
  agreementStatusBadge,
  getAgreementActionVisibility,
} from "@/components/agreements/record-detail/agreement-utils";
import { IssueRenewalButton } from "@/components/agreements/IssueRenewalButton";
import { AgreementKitItemsDialog } from "./AgreementKitItemsDialog";
import { FranchiseKitEditor } from "./FranchiseKitEditor";
import { AgreementReasonDialog } from "./AgreementReasonDialog";

/**
 * Single, context-aware admin action toolbar for one agreement. Renders the
 * full set of lifecycle / kit / document actions gated by
 * `getAgreementActionVisibility`, so the detail surface holds every action in
 * one place (no more bouncing between the list tab and the franchise workspace).
 */
export function AgreementActionBar({ agreement }: { agreement: AgreementRecord }) {
  const vis = getAgreementActionVisibility(agreement, "admin");
  const status = agreementStatusBadge(agreement.status, agreement.signed);

  const [downloading, setDownloading] = useState(false);
  const [kitItemsOpen, setKitItemsOpen] = useState(false);
  const [kitEditorOpen, setKitEditorOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const dispatchKit = useDispatchFranchiseKitMutation(agreement.id);
  const suspend = useSuspendAgreementMutation(agreement.id);
  const reactivate = useReactivateAgreementMutation(agreement.id);
  const voidMutation = useVoidAgreementMutation(agreement.id);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadScheduleBPdfAdmin(agreement.id);
      toast.success("Schedule B PDF download started");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to download Schedule B PDF"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <Badge variant={status.tone} className="mr-1 shrink-0">
          {status.label}
        </Badge>

        {vis.download ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => void handleDownload()}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Schedule B
          </Button>
        ) : null}

        {vis.manageKitItems ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setKitItemsOpen(true)}
          >
            <Package className="mr-2 h-4 w-4" />
            Manage kit items
          </Button>
        ) : null}

        {vis.franchiseKitEditor ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setKitEditorOpen(true)}
          >
            <PackageOpen className="mr-2 h-4 w-4" />
            Franchise kit
          </Button>
        ) : null}

        {vis.dispatchKit ? (
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            disabled={dispatchKit.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Create the one-time free franchise kit order for this agreement?",
                )
              ) {
                dispatchKit.mutate();
              }
            }}
          >
            {dispatchKit.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Truck className="mr-2 h-4 w-4" />
            )}
            Dispatch franchise kit
          </Button>
        ) : null}

        {vis.kitDispatched ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled
            title={
              agreement.franchiseKitOrderId != null
                ? "The free franchise kit order has already been created"
                : "The franchise kit is already marked as dispatched"
            }
          >
            <Truck className="mr-2 h-4 w-4" />
            {agreement.franchiseKitOrderId != null
              ? `Kit dispatched (Order #${agreement.franchiseKitOrderId})`
              : "Kit dispatched"}
          </Button>
        ) : null}

        {vis.suspend ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setSuspendOpen(true)}
            disabled={suspend.isPending}
          >
            <PauseCircle className="mr-2 h-4 w-4" />
            Suspend
          </Button>
        ) : null}

        {vis.reactivate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => {
              if (window.confirm("Reactivate this agreement?")) {
                reactivate.mutate();
              }
            }}
            disabled={reactivate.isPending}
          >
            {reactivate.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            Reactivate
          </Button>
        ) : null}

        {vis.void ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setVoidOpen(true)}
            disabled={voidMutation.isPending}
          >
            <Ban className="mr-2 h-4 w-4" />
            Void
          </Button>
        ) : null}

        {vis.renew ? <IssueRenewalButton agreement={agreement} /> : null}
      </div>

      <AgreementKitItemsDialog
        agreement={agreement}
        open={kitItemsOpen}
        onOpenChange={setKitItemsOpen}
      />

      <FranchiseKitEditor
        franchiseId={agreement.franchiseId ?? null}
        programId={agreement.programId ?? null}
        open={kitEditorOpen}
        onOpenChange={setKitEditorOpen}
      />

      <AgreementReasonDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title="Suspend agreement"
        description="The agreement will be paused. You can reactivate it later."
        submitLabel="Suspend"
        headerIcon={PauseCircle}
        isSubmitting={suspend.isPending}
        onSubmit={async (reason) => {
          await suspend.mutateAsync(reason);
        }}
      />

      <AgreementReasonDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Void agreement"
        description="Voiding is permanent and cannot be undone."
        submitLabel="Void agreement"
        headerIcon={Ban}
        isSubmitting={voidMutation.isPending}
        onSubmit={async (reason) => {
          await voidMutation.mutateAsync(reason);
        }}
      />
    </>
  );
}
