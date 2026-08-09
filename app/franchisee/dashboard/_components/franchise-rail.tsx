"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Eye, Loader2, PenLine, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  DetailDialog,
} from "@/components/shared/dialog";
import { AgreementRecordDetail } from "@/components/agreements/AgreementRecordDetail";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import { cleanAgreementTitle } from "@/components/agreements/agreement-utils";
import { SignatureCapturePanel } from "@/components/esignature/SignatureCapturePanel";
import type { ESignatureResult } from "@/components/esignature/ESignaturePad";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { type RazorpaySuccessResponse } from "@/components/RazorpayPayment";
import {
  franchiseeProfileSignatureSrc,
  submitFranchiseeSignature,
  updateFranchiseeSignatureOnly,
  type AgreementRecord,
  type ESignaturePayload,
} from "@/services/agreement.service";
import {
  getCIAgreementByIdForFranchisee,
  listCIAgreementsForFranchisee,
  signCIAgreementAsFranchisee,
  signCIAgreementAsFranchiseeFile,
  type CIAgreementData,
} from "@/services/contracting.service";
import {
  cancelProgramRequest,
  listProgramRequests,
  type ProgramRequestItem,
} from "@/services/program-request.service";
import {
  initiateReceivableItemPayment,
  verifyFranchiseFeePayment,
  type PaymentOrderResponse,
} from "@/services/franchisee.service";
import { abandonOrderPayment } from "@/services/order.service";
import { useAgreementMine, useAgreementsMine } from "@/hooks/api/agreement.hooks";
import { queryKeys } from "@/hooks/api/query-keys";
import { useUser } from "@/context/user-context";
import { deriveAgreementSummary } from "@/lib/agreement-summary";
import { agreementTypeLabel } from "@/lib/payment-details-display";
import { formatDate } from "@/lib/date-utils";
import { getErrorMessage, getUserFriendlyMessage } from "@/lib/error-utils";

const RazorpayPayment = dynamic(
  () => import("@/components/RazorpayPayment"),
  { ssr: false, loading: () => <Loader2 className="h-5 w-5 animate-spin" /> },
);

// ─── shared bits ─────────────────────────────────────────────────────────────

function RailCard({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 sm:p-5 sm:pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">{children}</CardContent>
    </Card>
  );
}

function RailSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3 py-1">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-4 rounded bg-muted" />
      ))}
    </div>
  );
}

// ─── agreement card ──────────────────────────────────────────────────────────

/**
 * Reads `?open=agreement` (the Overdue-EMI chip deep link) inside its own
 * Suspense boundary so the client page keeps prerendering.
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

function AgreementRailCard() {
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

  // `paymentId` died with the unification — activation (status ACTIVE /
  // activatedAt) is the "paid" signal now (same derivation as the old table).
  const paid =
    active != null &&
    (active.activatedAt != null ||
      active.status === "ACTIVE" ||
      active.status === "SUSPENDED" ||
      active.payment?.id != null);
  const statusLabel = active
    ? `${active.signed ? "Signed" : "Unsigned"} · ${paid ? "Paid" : "Awaiting payment"}`
    : null;

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
    <RailCard label="Franchise agreement">
      <Suspense fallback={null}>
        <OpenAgreementParamReader onTrigger={() => setWantsOpen(true)} />
      </Suspense>

      {agreementsQuery.isLoading && rows.length === 0 ? (
        <RailSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No agreements on file yet.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-lg font-semibold leading-snug text-card-foreground">
              {summary.activeExpiresAt
                ? `Valid till ${formatDate(summary.activeExpiresAt)}`
                : "No active agreement"}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.activeTenure ? `${summary.activeTenure}-month term` : null}
              {summary.activeTenure && summary.joinedAt ? " · " : null}
              {summary.joinedAt
                ? `joined ${formatDate(summary.joinedAt)}`
                : null}
            </p>
          </div>

          {progress ? (
            <div>
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

          <div className="flex flex-wrap items-center gap-2">
            {statusLabel ? <Badge variant="outline">{statusLabel}</Badge> : null}
            <span className="text-xs text-muted-foreground">
              {summary.renewalCount === 0
                ? "No renewals issued"
                : `${summary.renewalCount} renewal${summary.renewalCount === 1 ? "" : "s"} issued`}
            </span>
          </div>

          {rows.length > 1 ? (
            <div className="divide-y rounded-xl border">
              {rows.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {record.program?.name ?? record.programName ?? "Agreement"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agreementTypeLabel(record.kind, record.origin)}
                    </p>
                  </div>
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
              ))}
            </div>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => active && setViewAgreementId(active.id)}
            disabled={!active}
          >
            <Eye className="h-4 w-4" />
            View agreement
          </Button>
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
    </RailCard>
  );
}

// ─── programs card ───────────────────────────────────────────────────────────

function ProgramsRailCard({ onRequestProgram }: { onRequestProgram: () => void }) {
  const { user } = useUser();
  const franchiseId = user?.franchiseId;
  const [cancelling, setCancelling] = useState<number | null>(null);

  const requestsQuery = useQuery({
    queryKey: queryKeys.programRequests.franchisee({ franchiseId }),
    queryFn: async () => {
      const data = await listProgramRequests();
      return franchiseId
        ? data.filter((r) => r.franchiseId === franchiseId)
        : data;
    },
  });
  const requests = requestsQuery.data ?? [];

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await cancelProgramRequest(id);
      toast.success("Request cancelled");
      void requestsQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to cancel request"));
    } finally {
      setCancelling(null);
    }
  };

  return (
    <RailCard
      label="Programs"
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-primary"
          onClick={onRequestProgram}
        >
          <Plus className="h-3.5 w-3.5" />
          Request
        </Button>
      }
    >
      {requestsQuery.isLoading && requests.length === 0 ? (
        <RailSkeleton />
      ) : requests.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No program requests yet.
        </p>
      ) : (
        <div className="divide-y">
          {requests.map((r: ProgramRequestItem) => (
            <div key={r.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-card-foreground">
                  {r.program?.name ?? "—"}
                </p>
                {r.requestedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Requested {formatDate(r.requestedAt)}
                  </p>
                ) : null}
              </div>
              <StatusBadge label={r.status} />
              {r.status === "Pending" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Cancel request"
                  disabled={cancelling === r.id}
                  onClick={() => handleCancel(r.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </RailCard>
  );
}

// ─── CI agreements card ──────────────────────────────────────────────────────

const PHASE_CONFIG: Record<
  CIAgreementData["phase"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING_CI_SIGNATURE: { label: "Awaiting CI signature", variant: "secondary" },
  PENDING_FRANCHISEE_SIGNATURE: { label: "Awaiting your signature", variant: "outline" },
  SIGNED: { label: "Signed", variant: "default" },
  EXPIRED: { label: "Expired", variant: "destructive" },
};

function PhaseBadge({ phase }: { phase: CIAgreementData["phase"] }) {
  const { label, variant } = PHASE_CONFIG[phase] ?? { label: phase, variant: "secondary" };
  return <Badge variant={variant}>{label}</Badge>;
}

/** Moved verbatim from the retired franchise page's CI Agreements section. */
function CISignDialog({
  agreement,
  onSigned,
  onClose,
}: {
  agreement: CIAgreementData | null;
  onSigned: () => void;
  onClose: () => void;
}) {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);

  const profileSignatureSrc = franchiseeProfileSignatureSrc(
    user?.profile?.franchiseeSignature,
  );

  const handleSignWithExisting = async () => {
    if (!agreement) return;
    setSubmitting(true);
    try {
      await signCIAgreementAsFranchisee(agreement.id);
      toast.success("CI agreement signed successfully.");
      onSigned();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not sign agreement. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdoptESignature = async (payload: ESignatureResult) => {
    if (!agreement) return;
    setSubmitting(true);
    try {
      const blob = new Blob([payload.svg], { type: "image/svg+xml" });
      const file = new File([blob], "signature.svg", { type: "image/svg+xml" });
      await signCIAgreementAsFranchiseeFile(agreement.id, file);
      toast.success("CI agreement signed successfully.");
      onSigned();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not sign agreement. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !submitting) {
      onClose();
    }
  };

  return (
    <AppDialog open={!!agreement} onOpenChange={handleOpenChange} size="md">
      <AppDialogHeader
        title="Sign CI Agreement"
        description={agreement?.title ?? "Sign this course instructor agreement."}
      />
      <AppDialogBody>
        <SignatureCapturePanel
          storedSignature={profileSignatureSrc ?? undefined}
          signerLabel="Your signature"
          ctaLabel="Sign agreement"
          busy={submitting}
          defaultName={user?.profile?.name ?? user?.name ?? ""}
          onAdopt={handleAdoptESignature}
          onUseStored={handleSignWithExisting}
        />
      </AppDialogBody>
      <AppDialogFooter
        secondary={{
          label: "Cancel",
          onClick: onClose,
          disabled: submitting,
        }}
      />
    </AppDialog>
  );
}

function CIViewDialog({
  agreementId,
  onClose,
}: {
  agreementId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["franchisee-ci-agreement-detail", agreementId],
    queryFn: () => getCIAgreementByIdForFranchisee(agreementId!),
    enabled: agreementId !== null,
  });

  return (
    <DetailDialog
      open={agreementId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="2xl"
      title={cleanAgreementTitle(data?.title, "Course Instructor Agreement")}
      description="Read-only view of the CI agreement."
    >
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading agreement…
        </div>
      ) : !data ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          No agreement details found.
        </div>
      ) : (
        <CIAgreementDetail agreement={data} />
      )}
    </DetailDialog>
  );
}

function CIAgreementsRailCard() {
  const { user } = useUser();
  const [signingAgreement, setSigningAgreement] = useState<CIAgreementData | null>(null);
  const [viewingAgreementId, setViewingAgreementId] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["franchisee-ci-agreements", user?.franchiseId, "rail"],
    queryFn: () => listCIAgreementsForFranchisee({ page: 1, limit: 50 }),
    enabled: !!user,
  });

  useEffect(() => {
    if (error) toast.error(getErrorMessage(error, "Failed to load CI agreements"));
  }, [error]);

  const rows = data?.rows ?? [];

  return (
    <RailCard label="CI agreements">
      {isLoading && rows.length === 0 ? (
        <RailSkeleton />
      ) : rows.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No CI agreements on file yet.
        </p>
      ) : (
        <div className="max-h-72 divide-y overflow-y-auto">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-card-foreground">
                  {r.instructorName ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.expiresAt ? `Expires ${formatDate(r.expiresAt)}` : "No expiry set"}
                </p>
              </div>
              <PhaseBadge phase={r.phase} />
              <div className="flex items-center">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="View agreement"
                  onClick={() => setViewingAgreementId(r.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {r.phase === "PENDING_FRANCHISEE_SIGNATURE" && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Sign agreement"
                    onClick={() => setSigningAgreement(r)}
                  >
                    <PenLine className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CISignDialog
        agreement={signingAgreement}
        onSigned={() => {
          setSigningAgreement(null);
          void refetch();
        }}
        onClose={() => setSigningAgreement(null)}
      />

      <CIViewDialog
        agreementId={viewingAgreementId}
        onClose={() => setViewingAgreementId(null)}
      />
    </RailCard>
  );
}

// ─── rail ────────────────────────────────────────────────────────────────────

export interface FranchiseRailProps {
  /** Opens the page-level RequestProgramsModal. */
  onRequestProgram: () => void;
}

/**
 * The retired /franchisee/franchise page compressed into three dashboard rail
 * cards: agreement lifecycle, program requests, and CI agreements. Stacks in
 * the right column at xl; flows as a card row below that.
 */
export function FranchiseRail({ onRequestProgram }: FranchiseRailProps) {
  return (
    <div
      data-testid="franchise-rail"
      className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-1"
    >
      <AgreementRailCard />
      <ProgramsRailCard onRequestProgram={onRequestProgram} />
      <CIAgreementsRailCard />
    </div>
  );
}
