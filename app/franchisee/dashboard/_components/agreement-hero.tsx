"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
} from "@/components/shared/dialog";
import { AgreementRecordDetail } from "@/components/agreements/AgreementRecordDetail";
import { cleanAgreementTitle } from "@/components/agreements/agreement-utils";
import type { ESignatureResult } from "@/components/esignature/ESignaturePad";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { type RazorpaySuccessResponse } from "@/components/RazorpayPayment";
import {
  submitFranchiseeSignature,
  updateFranchiseeSignatureOnly,
  type AgreementRecord,
  type ESignaturePayload,
} from "@/services/agreement.service";
import {
  initiateReceivableItemPayment,
  verifyFranchiseFeePayment,
  type PaymentOrderResponse,
} from "@/services/franchisee.service";
import { abandonOrderPayment } from "@/services/order.service";
import { useAgreementMine, useAgreementsMine } from "@/hooks/api/agreement.hooks";
import { useUser } from "@/context/user-context";
import { deriveAgreementSummary } from "@/lib/agreement-summary";
import { formatDate } from "@/lib/date-utils";
import { formatRupeesOrFree } from "@/lib/currency-utils";
import { getErrorMessage, getUserFriendlyMessage } from "@/lib/error-utils";

const RazorpayPayment = dynamic(
  () => import("@/components/RazorpayPayment"),
  { ssr: false, loading: () => <Loader2 className="h-5 w-5 animate-spin" /> },
);

/**
 * Reads `?open=agreement` (the Overdue-EMI deep link) inside its own Suspense
 * boundary so the client page keeps prerendering.
 */
function OpenAgreementParamReader({ onTrigger }: { onTrigger: () => void }) {
  const searchParams = useSearchParams();
  const open = searchParams.get("open");
  useEffect(() => {
    if (open === "agreement") onTrigger();
  }, [open, onTrigger]);
  return null;
}

/** Moved verbatim from the retired franchise page's My Agreements section. */
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
    try {
      if (agreement?.signed) {
        await updateFranchiseeSignatureOnly(resolvedAgreementId, payload);
      } else {
        await submitFranchiseeSignature(resolvedAgreementId, payload);
      }
      toast.success("Signature saved");
      await agreementQuery.refetch();
    } catch (err) {
      toast.error(getUserFriendlyMessage(err, "Could not save signature."));
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      modal={!paymentOpen}
      size="2xl"
      padding="flush"
      maxHeight="max-h-[92vh]"
      scrollBody
    >
      <AppDialogHeader
        title={cleanAgreementTitle(agreement?.title)}
        description="View the agreement without leaving the dashboard."
      />
      <AppDialogBody>
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
      </AppDialogBody>
    </AppDialog>
  );
}

function termProgress(record: AgreementRecord | null): {
  pct: number;
  monthsLeft: number;
} | null {
  if (!record?.expiresAt) return null;
  const startRaw =
    record.activatedAt ?? record.dateOfSigning ?? record.createdAt ?? null;
  if (!startRaw) return null;
  const start = new Date(startRaw).getTime();
  const end = new Date(record.expiresAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  const now = Date.now();
  const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  const monthsLeft = Math.max(
    0,
    Math.round((end - now) / (1000 * 60 * 60 * 24 * 30.44)),
  );
  return { pct, monthsLeft };
}

/** Same "paid" derivation the old My Agreements table used. */
function isAgreementPaid(record: AgreementRecord): boolean {
  return (
    record.activatedAt != null ||
    record.status === "ACTIVE" ||
    record.status === "SUSPENDED" ||
    record.payment?.id != null
  );
}

function pickLatestRenewal(rows: AgreementRecord[]): AgreementRecord | null {
  const renewals = rows.filter((r) => r.origin === "RENEWAL");
  if (renewals.length === 0) return null;
  return renewals.reduce((latest, row) => {
    const basis = (r: AgreementRecord) =>
      new Date(r.activatedAt ?? r.dateOfSigning ?? r.createdAt ?? 0).getTime();
    return basis(row) > basis(latest) ? row : latest;
  });
}

function HeroColumn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-4 sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

export interface AgreementHeroProps {
  /** Display value/sub of the franchise-fee summary (same builder the old stat cell used). */
  feeValue: string;
  feeSub?: string;
  /** Latest completed franchise-fee payment date, when known. */
  feePaidAt: string | null;
  /** True when an EMI is overdue — surfaces the red chip on the fee column. */
  overdue: boolean;
}

/**
 * The franchise agreement band — validity, franchise fee, and renewal in one
 * card section directly under the dashboard header. Absorbs the old
 * "Franchise Fee Paid" stat cell and the rail's agreement card.
 */
export function AgreementHero({
  feeValue,
  feeSub,
  feePaidAt,
  overdue,
}: AgreementHeroProps) {
  const { user } = useUser();
  const router = useRouter();
  const agreementsQuery = useAgreementsMine(user?.franchiseId, {});
  const rows = agreementsQuery.data ?? [];
  const [viewAgreementId, setViewAgreementId] = useState<number | null>(null);
  const [wantsOpen, setWantsOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] =
    useState<PaymentOrderResponse | null>(null);
  const [isInitiatingReceivablePayment, setIsInitiatingReceivablePayment] =
    useState(false);

  const summary = deriveAgreementSummary(rows);
  const franchiseRows = rows.filter((r) => r.kind === "FRANCHISE");
  const preferred = franchiseRows.length > 0 ? franchiseRows : rows;
  const active =
    preferred.find((r) => r.status === "ACTIVE") ?? preferred[0] ?? null;
  const progress = termProgress(
    active && active.status === "ACTIVE" ? active : null,
  );
  const statusLabel = active
    ? `${active.signed ? "Signed" : "Unsigned"} · ${isAgreementPaid(active) ? "Paid" : "Awaiting payment"}`
    : null;

  const renewal = pickLatestRenewal(preferred);
  const renewalPaid = renewal ? isAgreementPaid(renewal) : false;

  // Overdue-EMI deep link: open the agreement dialog once rows are available.
  useEffect(() => {
    if (!wantsOpen || rows.length === 0) return;
    setViewAgreementId(active?.id ?? rows[0].id);
    setWantsOpen(false);
    router.replace("/franchisee/dashboard", { scroll: false });
  }, [wantsOpen, rows, active, router]);

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

  return (
    <div className="border-b" data-testid="agreement-hero">
      <Suspense fallback={null}>
        <OpenAgreementParamReader onTrigger={() => setWantsOpen(true)} />
      </Suspense>

      {agreementsQuery.isLoading && rows.length === 0 ? (
        <div className="grid md:grid-cols-[1.35fr_1fr_1fr]">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3 px-4 py-4 sm:px-5">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-7 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
          No agreements on file yet.
        </p>
      ) : (
        <div className="grid divide-y md:grid-cols-[1.35fr_1fr_1fr] md:divide-x md:divide-y-0">
          <HeroColumn label="Franchise agreement">
            <p className="text-xl font-semibold leading-snug text-card-foreground">
              {summary.activeExpiresAt
                ? `Valid till ${formatDate(summary.activeExpiresAt)}`
                : "No active agreement"}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.joinedAt ? `Started ${formatDate(summary.joinedAt)}` : null}
              {summary.joinedAt && summary.activeTenure ? " · " : null}
              {summary.activeTenure ? `${summary.activeTenure}-month term` : null}
            </p>

            {progress ? (
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(progress.pct)}% of term elapsed</span>
                  <span className="font-medium text-primary">
                    {progress.monthsLeft} month{progress.monthsLeft === 1 ? "" : "s"} left
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {statusLabel ? <Badge variant="outline">{statusLabel}</Badge> : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-primary"
                onClick={() => active && setViewAgreementId(active.id)}
                disabled={!active}
              >
                <Eye className="h-3.5 w-3.5" />
                View agreement
              </Button>
            </div>
          </HeroColumn>

          <HeroColumn label="Franchise fee">
            <p className="text-xl font-semibold leading-snug text-card-foreground">
              {feeValue}
            </p>
            <p className="text-xs text-muted-foreground">
              {feeSub ??
                (feePaidAt ? `Paid in full · ${formatDate(feePaidAt)}` : null) ??
                "—"}
            </p>
            <div className="mt-2">
              {overdue ? (
                <button
                  type="button"
                  className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive"
                  onClick={() => active && setViewAgreementId(active.id)}
                >
                  Overdue
                </button>
              ) : !feeSub ? (
                <p className="text-xs text-muted-foreground">No dues pending</p>
              ) : null}
            </div>
          </HeroColumn>

          <HeroColumn label="Renewal">
            {!renewal ? (
              <>
                <p className="text-xl font-medium leading-snug text-muted-foreground">
                  —
                </p>
                <p className="text-xs text-muted-foreground">
                  No renewal issued yet
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold leading-snug text-card-foreground">
                  {renewal.franchiseFee != null
                    ? formatRupeesOrFree(renewal.franchiseFee)
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {renewalPaid
                    ? `Renewed ${formatDate(
                        renewal.activatedAt ?? renewal.dateOfSigning ?? renewal.createdAt,
                      )}`
                    : `Issued ${formatDate(renewal.createdAt)}`}
                  {renewal.expiresAt
                    ? ` · valid till ${formatDate(renewal.expiresAt)}`
                    : null}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {renewalPaid ? "Paid" : "Awaiting payment"}
                  </Badge>
                  {!renewalPaid ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary"
                      onClick={() => setViewAgreementId(renewal.id)}
                    >
                      Pay renewal
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </HeroColumn>
        </div>
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
    </div>
  );
}
