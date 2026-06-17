"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
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
  submitFranchiseeSignature,
  updateFranchiseeSignatureOnly,
  type AgreementRecord,
  type ESignaturePayload,
} from "@/services/agreement.service";
import { agreementTypeBadgeClass, agreementTypeLabel } from "@/lib/payment-details-display";
import type { ESignatureResult } from "@/components/esignature/ESignaturePad";
import {
  ReceivableCompactProgress,
} from "@/components/receivables/InstallmentSummaryCard";
import { getErrorMessage } from "@/lib/error-utils";
import { useAgreementMine, useAgreementsMine } from "@/hooks/api/agreement.hooks";
import { useUser } from "@/context/user-context";
import dynamic from "next/dynamic";
import { type RazorpaySuccessResponse } from "@/components/RazorpayPayment";

const RazorpayPayment = dynamic(
  () => import("@/components/RazorpayPayment"),
  { ssr: false, loading: () => <Loader2 className="h-5 w-5 animate-spin" /> },
);
import {
  initiateReceivableItemPayment,
  verifyFranchiseFeePayment,
  type PaymentOrderResponse,
} from "@/services/franchisee.service";
import { abandonOrderPayment } from "@/services/order.service";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";

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

  async function handleSign(result: ESignatureResult) {
    if (!resolvedAgreementId) return;
    const payload: ESignaturePayload = result;
    if (agreement?.signed) {
      await updateFranchiseeSignatureOnly(resolvedAgreementId, payload);
    } else {
      await submitFranchiseeSignature(resolvedAgreementId, payload);
    }
    toast.success("Signature saved");
    await agreementQuery.refetch();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!paymentOpen}>
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
              onSign={handleSign}
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
      render: (record) => (
        <Badge variant="outline" className={agreementTypeBadgeClass(record.type)}>
          {agreementTypeLabel(record.type)}
        </Badge>
      ),
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
              {record.franchise?.name ?? record.franchiseId ?? "—"}
              <span className="mx-1 text-muted-foreground">-</span>
              {record.program?.name ?? record.programName ?? "—"}
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
        <ComponentErrorBoundary componentName="RazorpayPayment">
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
        </ComponentErrorBoundary>
      ) : null}
    </TablePageShell>
  );
}
