"use client";

import { useState } from "react";
import { Download, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  downloadScheduleBPdfAdmin,
  type AgreementRecord,
} from "@/services/agreement.service";
import { getErrorMessage } from "@/lib/error-utils";
import { useReactivateAgreementMutation } from "@/hooks/api/agreement.hooks";
import {
  agreementStatusBadge,
  getAgreementActionVisibility,
} from "@/components/agreements/record-detail/agreement-utils";
import { IssueRenewalButton } from "@/components/agreements/IssueRenewalButton";
import { ConfirmDialog } from "@/components/shared/dialog";

/**
 * Context-aware admin action toolbar for one agreement's detail surface. Holds
 * the document and lifecycle actions that belong on the full record view
 * (Schedule B, reactivate, renewal). Kit management and the suspend / void
 * lifecycle actions now live on each agreements-list row via
 * `AgreementRowActions`.
 */
export function AgreementActionBar({ agreement }: { agreement: AgreementRecord }) {
  const vis = getAgreementActionVisibility(agreement, "admin");
  const status = agreementStatusBadge(agreement.status, agreement.signed);

  const [downloading, setDownloading] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const reactivate = useReactivateAgreementMutation(agreement.id);

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

      {vis.reactivate ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => setReactivateOpen(true)}
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

      {vis.renew ? <IssueRenewalButton agreement={agreement} /> : null}
      <ConfirmDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        title="Reactivate this agreement?"
        description="The agreement returns to its active lifecycle state."
        confirmLabel="Reactivate"
        onConfirm={() => {
          reactivate.mutate();
          setReactivateOpen(false);
        }}
        isConfirming={reactivate.isPending}
      />
    </div>
  );
}
