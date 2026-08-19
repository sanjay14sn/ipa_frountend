"use client";

import { useState } from "react";
import {
  Ban,
  Download,
  Eye,
  MoreHorizontal,
  PackageOpen,
  PauseCircle,
  RefreshCw,
} from "lucide-react";
import {
  getScheduleBPdfPathAdmin,
  type AgreementRecord,
} from "@/services/agreement.service";
import { FilePreviewDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useSuspendAgreementMutation,
  useVoidAgreementMutation,
} from "@/hooks/api/agreement.hooks";
import { getAgreementActionVisibility } from "@/components/agreements/record-detail/agreement-utils";
import { IssueRenewalDialog } from "@/components/agreements/IssueRenewalButton";
import { ManageKitDialog } from "./ManageKitDialog";
import { AgreementReasonDialog } from "./AgreementReasonDialog";

/**
 * Row overflow menu for the admin agreements list (R1: Eye stays inline,
 * everything else lives here — destructive item last). Hosts the kit,
 * renewal, and suspend/void reason dialogs so menu items stay plain
 * triggers.
 */
export function AgreementRowActions({
  agreement,
  onDownloadScheduleB,
}: {
  agreement: AgreementRecord;
  onDownloadScheduleB: () => void | Promise<void>;
}) {
  const vis = getAgreementActionVisibility(agreement, "admin");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [manageKitOpen, setManageKitOpen] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const suspend = useSuspendAgreementMutation(agreement.id);
  const voidMutation = useVoidAgreementMutation(agreement.id);

  const showManageKit =
    vis.manageKitItems ||
    vis.franchiseKitEditor ||
    vis.dispatchKit ||
    vis.kitDispatched;
  const showRenewal = vis.renew;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            title="More actions"
            aria-label="More actions"
            disabled={suspend.isPending || voidMutation.isPending}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View Schedule B
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void onDownloadScheduleB()}>
            <Download className="mr-2 h-4 w-4" />
            Download Schedule B
          </DropdownMenuItem>
          {showManageKit ? (
            <DropdownMenuItem onSelect={() => setManageKitOpen(true)}>
              <PackageOpen className="mr-2 h-4 w-4" />
              Manage kit
            </DropdownMenuItem>
          ) : null}
          {showRenewal ? (
            <DropdownMenuItem onSelect={() => setRenewalOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Issue renewal
            </DropdownMenuItem>
          ) : null}
          {vis.suspend ? (
            <DropdownMenuItem onSelect={() => setSuspendOpen(true)}>
              <PauseCircle className="mr-2 h-4 w-4" />
              Suspend
            </DropdownMenuItem>
          ) : null}
          {vis.void ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setVoidOpen(true)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Void
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <FilePreviewDialog
        files={[
          {
            url: getScheduleBPdfPathAdmin(agreement.id),
            filename: `schedule-b-agreement-${agreement.id}.pdf`,
          },
        ]}
        index={previewOpen ? 0 : null}
        onIndexChange={() => {}}
        onClose={() => setPreviewOpen(false)}
      />

      {showManageKit ? (
        <ManageKitDialog
          agreement={agreement}
          vis={vis}
          open={manageKitOpen}
          onOpenChange={setManageKitOpen}
        />
      ) : null}

      {showRenewal ? (
        <IssueRenewalDialog
          agreement={agreement}
          open={renewalOpen}
          onOpenChange={setRenewalOpen}
        />
      ) : null}

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
