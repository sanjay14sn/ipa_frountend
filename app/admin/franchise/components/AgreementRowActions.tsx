"use client";

import { useState } from "react";
import { Ban, PackageOpen, PauseCircle, Settings2 } from "lucide-react";
import type { AgreementRecord } from "@/services/agreement.service";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useSuspendAgreementMutation,
  useVoidAgreementMutation,
} from "@/hooks/api/agreement.hooks";
import { getAgreementActionVisibility } from "@/components/agreements/record-detail/agreement-utils";
import { ManageKitDialog } from "./ManageKitDialog";
import { AgreementReasonDialog } from "./AgreementReasonDialog";

/**
 * Compact, row-level agreement management actions for the admin agreements list:
 * a single "Manage kit" trigger (tabbed kit dialog) and a "Manage" dropdown for
 * the suspend / void lifecycle actions. Lets admins act on an agreement straight
 * from the table without opening the detail sheet.
 */
export function AgreementRowActions({
  agreement,
}: {
  agreement: AgreementRecord;
}) {
  const vis = getAgreementActionVisibility(agreement, "admin");

  const [manageKitOpen, setManageKitOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const suspend = useSuspendAgreementMutation(agreement.id);
  const voidMutation = useVoidAgreementMutation(agreement.id);

  const showManageKit =
    vis.manageKitItems ||
    vis.franchiseKitEditor ||
    vis.dispatchKit ||
    vis.kitDispatched;
  const showManageMenu = vis.suspend || vis.void;

  if (!showManageKit && !showManageMenu) return null;

  return (
    <>
      {showManageKit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0"
          title="Manage kit"
          aria-label="Manage kit"
          onClick={() => setManageKitOpen(true)}
        >
          <PackageOpen className="h-4 w-4" />
        </Button>
      ) : null}

      {showManageMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0"
              title="Manage agreement"
              aria-label="Manage agreement"
              disabled={suspend.isPending || voidMutation.isPending}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {vis.suspend ? (
              <DropdownMenuItem onSelect={() => setSuspendOpen(true)}>
                <PauseCircle className="mr-2 h-4 w-4" />
                Suspend
              </DropdownMenuItem>
            ) : null}
            {vis.void ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setVoidOpen(true)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Void
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {showManageKit ? (
        <ManageKitDialog
          agreement={agreement}
          vis={vis}
          open={manageKitOpen}
          onOpenChange={setManageKitOpen}
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
