"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AgreementRecordDetail } from "@/components/agreements/AgreementRecordDetail";
import type { ReceivableSummaryItem } from "@/services/agreement.service";
import { getErrorMessage } from "@/lib/error-utils";
import {
  useAgreementAdmin,
  useRecordReceivablePaymentMutation,
  useSendReceivableReminderMutation,
  useUpdateReceivableDueDateMutation,
  useWaiveReceivableItemMutation,
} from "@/hooks/api/agreement.hooks";
import { AgreementActionBar } from "./AgreementActionBar";
import { WaiveReceivableDialog } from "./WaiveReceivableDialog";
import { RecordReceivablePaymentDialog } from "./RecordReceivablePaymentDialog";

/** Strip a trailing UUID and/or `#id` suffix from the stored agreement title. */
function cleanAgreementTitle(title: string | null | undefined): string {
  const cleaned = (title ?? "")
    .replace(
      /\s+\S*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\S*$/i,
      "",
    )
    .replace(/\s+#?\d+\s*$/, "")
    .trim();
  return cleaned || "Franchise Agreement";
}

/**
 * The single canonical admin agreement detail surface: a right-side slide-over
 * holding the full record detail + the context-aware action bar + every
 * receivable action. Opened from any admin agreements list (the standalone tab
 * and the franchise-details tab) via `?agreementId=`.
 */
export function AdminAgreementDetailSheet({
  agreementId,
  open,
  onOpenChange,
}: {
  agreementId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const agreementQuery = useAgreementAdmin(
    open ? agreementId ?? undefined : undefined,
  );
  const agreement = agreementQuery.data ?? null;

  const [waiveItem, setWaiveItem] = useState<ReceivableSummaryItem | null>(null);
  const [waiveOpen, setWaiveOpen] = useState(false);
  const [recordItem, setRecordItem] = useState<ReceivableSummaryItem | null>(
    null,
  );

  const waive = useWaiveReceivableItemMutation(agreementId ?? 0);
  const updateDueDate = useUpdateReceivableDueDateMutation(agreementId ?? 0);
  const recordPayment = useRecordReceivablePaymentMutation(agreementId ?? 0);
  const sendReminder = useSendReceivableReminderMutation(agreementId ?? 0);

  useEffect(() => {
    if (agreementQuery.error) {
      toast.error(
        getErrorMessage(agreementQuery.error, "Failed to load agreement"),
      );
    }
  }, [agreementQuery.error]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,95vw)]"
        >
          <SheetHeader className="border-b border-border px-4 py-4 sm:px-5">
            <SheetTitle>{cleanAgreementTitle(agreement?.title)}</SheetTitle>
            <SheetDescription>
              View and manage this agreement — terms, EMI, payments, and
              lifecycle.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {agreementQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading agreement…
              </div>
            ) : agreement ? (
              <AgreementRecordDetail
                data={agreement}
                actionBar={<AgreementActionBar agreement={agreement} />}
                onWaiveItem={(item) => {
                  setWaiveItem(item);
                  setWaiveOpen(true);
                }}
                onEditDueDate={(itemId, dueAt) =>
                  updateDueDate.mutateAsync({ itemId, dueAt })
                }
                isUpdatingDueDate={updateDueDate.isPending}
                onRecordPayment={(item) => setRecordItem(item)}
                onSendReminder={(item) =>
                  sendReminder.mutate({ itemId: item.receivableItemId })
                }
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Agreement not found.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <WaiveReceivableDialog
        item={waiveItem}
        open={waiveOpen}
        onOpenChange={setWaiveOpen}
        onSubmit={async (itemId, reason) => {
          await waive.mutateAsync({ itemId, reason });
          toast.success("Receivable waived successfully");
        }}
        isSubmitting={waive.isPending}
      />

      <RecordReceivablePaymentDialog
        item={recordItem}
        open={!!recordItem}
        onOpenChange={(v) => {
          if (!v) setRecordItem(null);
        }}
        onSubmit={async (data) => {
          if (!recordItem) return;
          await recordPayment.mutateAsync({
            itemId: recordItem.receivableItemId,
            ...data,
          });
          setRecordItem(null);
        }}
        isSubmitting={recordPayment.isPending}
      />
    </>
  );
}
