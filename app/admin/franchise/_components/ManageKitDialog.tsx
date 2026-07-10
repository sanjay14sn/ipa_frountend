"use client";

import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import type { AgreementRecord } from "@/services/agreement.service";
import type { AgreementActionVisibility } from "@/components/agreements/record-detail/agreement-utils";
import { useDispatchFranchiseKitMutation } from "@/hooks/api/agreement.hooks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgreementKitItemsPanel } from "./AgreementKitItemsDialog";
import { ConfirmDialog, FormDialog } from "@/components/shared/dialog";
import { FranchiseKitPanel } from "./FranchiseKitEditor";

interface ManageKitDialogProps {
  agreement: AgreementRecord;
  vis: AgreementActionVisibility;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Single "Manage kit" surface for one agreement. Combines the agreement kit
 * items editor, the per-franchise kit editor, and the one-time franchise kit
 * dispatch action into one tabbed dialog so admins manage everything kit-related
 * from a single button.
 */
export function ManageKitDialog({
  agreement,
  vis,
  open,
  onOpenChange,
}: ManageKitDialogProps) {
  const dispatchKit = useDispatchFranchiseKitMutation(agreement.id);
  const [dispatchConfirmOpen, setDispatchConfirmOpen] = useState(false);

  const showItems = vis.manageKitItems;
  const showFranchise = vis.franchiseKitEditor;
  const showDispatch = vis.dispatchKit || vis.kitDispatched;

  const defaultTab = showItems
    ? "items"
    : showFranchise
      ? "franchise"
      : "dispatch";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      scrollBody
      hideFooter
      title={`Manage kit - Agreement #${agreement.id}`}
      description="Manage kit items, the franchise kit, and the one-time kit dispatch for this agreement."
    >

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="flex w-full flex-wrap">
            {showItems ? (
              <TabsTrigger value="items">Kit items</TabsTrigger>
            ) : null}
            {showFranchise ? (
              <TabsTrigger value="franchise">Franchise kit</TabsTrigger>
            ) : null}
            {showDispatch ? (
              <TabsTrigger value="dispatch">Dispatch franchise kit</TabsTrigger>
            ) : null}
          </TabsList>

          {showItems ? (
            <TabsContent value="items">
              <AgreementKitItemsPanel agreement={agreement} />
            </TabsContent>
          ) : null}

          {showFranchise ? (
            <TabsContent value="franchise">
              <FranchiseKitPanel
                franchiseId={agreement.franchiseId ?? null}
                programId={agreement.programId ?? null}
              />
            </TabsContent>
          ) : null}

          {showDispatch ? (
            <TabsContent value="dispatch">
              <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                {vis.kitDispatched ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {agreement.franchiseKitOrderId != null
                        ? `The free franchise kit order has already been created (Order #${agreement.franchiseKitOrderId}).`
                        : "The franchise kit is already marked as dispatched."}
                    </p>
                    <Button type="button" variant="outline" size="sm" disabled>
                      <Truck className="mr-2 h-4 w-4" />
                      {agreement.franchiseKitOrderId != null
                        ? `Kit dispatched (Order #${agreement.franchiseKitOrderId})`
                        : "Kit dispatched"}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Create the one-time free franchise kit order for this
                      agreement.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={dispatchKit.isPending}
                      onClick={() => setDispatchConfirmOpen(true)}
                    >
                      {dispatchKit.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Truck className="mr-2 h-4 w-4" />
                      )}
                      Dispatch franchise kit
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
        <ConfirmDialog
          open={dispatchConfirmOpen}
          onOpenChange={setDispatchConfirmOpen}
          title="Dispatch franchise kit?"
          description="Create the one-time free franchise kit order for this agreement."
          confirmLabel="Create order"
          onConfirm={() => {
            dispatchKit.mutate();
            setDispatchConfirmOpen(false);
          }}
          isConfirming={dispatchKit.isPending}
        />
    </FormDialog>
  );
}
