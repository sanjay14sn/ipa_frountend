"use client";

import { useEffect, useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/shared";
import {
  downloadScheduleBPdfMine,
  type AgreementRecord,
} from "@/services/agreement.service";
import {
  ReceivableCompactProgress,
} from "@/components/receivables/InstallmentSummaryCard";
import { getErrorMessage } from "@/lib/error-utils";
import { useAgreementMine, useAgreementsMine } from "@/hooks/api/agreement.hooks";
import { useUser } from "@/context/user-context";
import RazorpayPayment, {
  type RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";
import {
  initiateReceivableItemPayment,
  verifyFranchiseFeePayment,
  type PaymentOrderResponse,
} from "@/services/franchisee.service";
import { abandonOrderPayment } from "@/services/order.service";

function FranchiseeAgreementViewDialog({
  agreementId,
  open,
  paymentOpen,
  onOpenChange,
  onInitiatePayment,
  isInitiatingReceivablePayment,
}: {
  agreementId: number | null;
  open: boolean;
  paymentOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInitiatePayment: (
    agreementId: number,
    onRefresh: () => Promise<void>,
  ) => Promise<void>;
  isInitiatingReceivablePayment: boolean;
}) {
  const agreementQuery = useAgreementMine(open ? agreementId ?? undefined : undefined);

  useEffect(() => {
    if (agreementQuery.error) {
      toast.error(
        getErrorMessage(agreementQuery.error, "Failed to load agreement"),
      );
    }
  }, [agreementQuery.error]);

  const agreement = agreementQuery.data ?? null;
  const resolvedAgreementId = agreement?.id ?? agreementId ?? 0;

  async function handlePayReceivableItem() {
    if (!resolvedAgreementId) return;
    await onInitiatePayment(resolvedAgreementId, async () => {
      await agreementQuery.refetch();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!paymentOpen}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[min(1200px,94vw)]">
        <DialogHeader className="border-b border-border px-4 py-4 text-left sm:px-5">
          <DialogTitle>
            {agreement ? (agreement.title || `Agreement #${agreement.id}`).replace(/\s+[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i, "").trim() : "Agreement details"}
          </DialogTitle>
          <DialogDescription>
            View the agreement without leaving the My agreements table.
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
              onPayReceivableItem={handlePayReceivableItem}
              isInitiatingReceivablePayment={isInitiatingReceivablePayment}
            />
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

export function MyAgreementsSection() {
  const { user } = useUser();
  const agreementsQuery = useAgreementsMine(user?.franchiseId, {});
  const rows = agreementsQuery.data ?? [];
  const loading = agreementsQuery.isLoading;
  const [viewAgreementId, setViewAgreementId] = useState<number | null>(null);
  const [paymentDetails, setPaymentDetails] =
    useState<PaymentOrderResponse | null>(null);
  const [isInitiatingReceivablePayment, setIsInitiatingReceivablePayment] =
    useState(false);

  useEffect(() => {
    if (agreementsQuery.error) {
      toast.error(getErrorMessage(agreementsQuery.error, "Failed to load agreements"));
    }
  }, [agreementsQuery.error]);

  async function handleInitiatePayment(
    agreementId: number,
    onRefresh: () => Promise<void>,
  ) {
    try {
      setIsInitiatingReceivablePayment(true);
      const payment = await initiateReceivableItemPayment(agreementId);
      if (payment.isZeroAmount) {
        toast.success("This EMI has no payable amount.");
        await onRefresh();
        await agreementsQuery.refetch();
        return;
      }
      setPaymentDetails(payment);
    } catch (e) {
      toast.error(getErrorMessage(e, "Unable to start EMI payment"));
    } finally {
      setIsInitiatingReceivablePayment(false);
    }
  }

  async function handlePaymentSuccess(response: RazorpaySuccessResponse) {
    try {
      await verifyFranchiseFeePayment({
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      });
      toast.success("EMI payment verified");
      setPaymentDetails(null);
      await agreementsQuery.refetch();
    } catch (e) {
      toast.error(getErrorMessage(e, "Payment verification failed"));
      setPaymentDetails(null);
    }
  }

  function handlePaymentFailure(error: unknown) {
    toast.error(getErrorMessage(error, "Payment was not completed"));
    setPaymentDetails(null);
  }

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
      key: "status",
      header: "Status",
      className: "text-center",
      render: (record) => {
        const paid =
          record.paymentId != null || record.payment?.id != null;
        const parts: string[] = [];
        parts.push(record.signed ? "Signed" : "Unsigned");
        parts.push(paid ? "Paid" : "Awaiting payment");
        return <Badge variant="outline">{parts.join(" · ")}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[120px] text-center",
      render: (record) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="View agreement"
            onClick={() => setViewAgreementId(record.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Download Schedule B PDF"
            onClick={async () => {
              try {
                await downloadScheduleBPdfMine(record.id);
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
      title="My agreements"
      description="Signed records for your franchises: programs, payment links, and signatures."
    >
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
              {record.program?.name ?? record.programName ?? record.title ?? `Agreement #${record.id}`}
            </span>
          )}
          emptyMessage="No agreements on file yet."
          resultsText={(_count, total) =>
            `${total} agreement${total === 1 ? "" : "s"}`
          }
        />
      )}

      <FranchiseeAgreementViewDialog
        agreementId={viewAgreementId}
        open={viewAgreementId != null}
        paymentOpen={paymentDetails != null}
        onInitiatePayment={handleInitiatePayment}
        isInitiatingReceivablePayment={isInitiatingReceivablePayment}
        onOpenChange={(open) => {
          if (!open) setViewAgreementId(null);
        }}
      />

      {paymentDetails && user?.profile ? (
        <RazorpayPayment
          key={paymentDetails.orderId}
          orderId={paymentDetails.orderId}
          amount={paymentDetails.amount}
          currency={paymentDetails.currency}
          franchiseName={paymentDetails.franchiseName || "Franchise"}
          razorpayKey={paymentDetails.key}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onAbandon={async ({ orderId, reason }) => {
            await abandonOrderPayment({
              razorpayOrderId: orderId,
              note: reason,
            });
          }}
          userDetails={{
            name: user.profile.name,
            email: user.profile.mail,
            phone: user.profile.phone,
          }}
        />
      ) : null}
    </TablePageShell>
  );
}
