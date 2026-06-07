"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, PenLine } from "lucide-react";
import { useUser } from "@/context/user-context";
import {
  AgreementContent,
  getProcessedAgreementContent,
} from "@/lib/agreementContent";
import FranchiseeInformation from "./components/FranchiseeInformation";
import LocationDetails from "./components/LocationDetails";
import FranchiseDetails from "./components/FranchiseDetails";
import PaymentBreakdown from "./components/PaymentBreakdown";
import AgreementTerms from "./components/AgreementTerms";
import PaymentAction from "./components/PaymentAction";
import { AgreementExpiredView } from "./components/AgreementExpiredView";
import { EmiTimeline } from "@/components/receivables/EmiTimeline";
import { getFranchiseFeePayable } from "@/lib/gst";
import { FranchiseAgreementSignaturePanel } from "./components/FranchiseAgreementSignaturePanel";
import {
  AgreementStepper,
  queryToStep,
  stepToQuery,
  type AgreementStepIndex,
} from "./components/AgreementStepper";
import dynamic from "next/dynamic";
import {
  type RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";
import {
  initiateAgreementFeePayment,
  verifyFranchiseFeePayment,
} from "@/services/franchisee.service";
import {
  agreementSignatureSrc,
  downloadScheduleBPdfMine,
  franchiseeProfileSignatureSrc,
  getReceivablePlanMine,
  submitFranchiseeSignature,
  submitFranchiseeSignatureWithStored,
  type AgreementRecord,
  type ESignaturePayload,
  type ReceivableInstallmentSummary,
} from "@/services/agreement.service";

const RazorpayPayment = dynamic(
  () => import("@/components/RazorpayPayment"),
  { ssr: false, loading: () => <Loader2 className="h-5 w-5 animate-spin" /> },
);
const ESignaturePad = dynamic(
  () => import("@/components/esignature/ESignaturePad").then((m) => ({ default: m.ESignaturePad })),
  { ssr: false, loading: () => <Loader2 className="h-5 w-5 animate-spin" /> },
);
import { getFranchiseeProfile } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/error-utils";
import {
  buildFranchiseDataForAgreementPage,
  resolveAgreementPayableAmount,
} from "@/lib/agreement-page-terms";
import { queryKeys } from "@/hooks/api/query-keys";
import { useAgreementMine, useAgreementsMine } from "@/hooks/api/agreement.hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/auth";
import { getEffectiveFranchiseStatus, isFranchiseOperational } from "@/lib/auth";
import { abandonOrderPayment } from "@/services/order.service";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { sendClientLog } from "@/lib/client-telemetry";

function normalizeFranchiseeProfile(
  profileData: Record<string, unknown>,
): NonNullable<User["profile"]> {
  const base = profileData as NonNullable<User["profile"]>;
  const profile = profileData as {
    franchise?: {
      city?: string;
      state?: string;
      pincode?: string;
      address?: string;
    };
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
  };

  return {
    ...base,
    city: profile.franchise?.city ?? profile.city ?? base.city,
    state: profile.franchise?.state ?? profile.state ?? base.state,
    pincode: profile.franchise?.pincode ?? profile.pincode ?? base.pincode,
    address: profile.franchise?.address ?? profile.address ?? base.address,
  };
}

/**
 * Pauses execution for `ms` milliseconds.
 *
 * Used by `waitForActivation()` to poll the backend every 1.5 s (up to 6
 * attempts) after a franchise-fee payment, waiting for the franchise status
 * to flip to "Active" before redirecting to the dashboard. This is intentional
 * and not leftover debug code.
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function FranchiseAgreementContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const franchiseIdParam = searchParams.get("franchiseId");
  // When set, the page renders for an explicit agreement (typically a
  // NEW_PROGRAM picked via the header agreement switcher). When absent, the
  // page behaves as the franchise onboarding flow — auto-picking the latest
  // NEW_FRANCHISE agreement.
  const agreementIdParamRaw = searchParams.get("agreementId");
  const explicitAgreementId = agreementIdParamRaw
    ? Number(agreementIdParamRaw)
    : undefined;
  const hasExplicitAgreementId =
    explicitAgreementId != null && Number.isFinite(explicitAgreementId);
  const { user, setUser, switchFranchise } = useUser();
  const [currentStep, setCurrentStep] = useState<AgreementStepIndex>(1);
  const [pageLoading, setPageLoading] = useState(true);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activationSyncing, setActivationSyncing] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [agreementContent, setAgreementContent] =
    useState<AgreementContent | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [paymentDetails, setPaymentDetails] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    franchiseName: string;
    key: string;
  } | null>(null);
  const [feeAgreement, setFeeAgreement] = useState<AgreementRecord | null>(
    null,
  );
  const [feeAgreementLoading, setFeeAgreementLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [eSignatureOpen, setESignatureOpen] = useState(false);
  const [fullReceivablePlan, setFullReceivablePlan] =
    useState<ReceivableInstallmentSummary | null>(null);
  const [fullReceivablePlanLoading, setFullReceivablePlanLoading] =
    useState(false);
  const franchiseStatus = getEffectiveFranchiseStatus(user, franchiseIdParam);
  const effectiveFranchiseId = franchiseIdParam || user?.franchiseId;
  const activePaymentOrderIdRef = useRef<string | null>(null);
  const paymentSettledRef = useRef(false);
  const agreementsQuery = useAgreementsMine(undefined, undefined);
  const latestAgreementId = useMemo(() => {
    // Explicit ?agreementId=<id> wins: that's the agreement the user landed
    // here to sign/pay (typically a NEW_PROGRAM picked from the switcher).
    if (hasExplicitAgreementId) return explicitAgreementId;
    if (!effectiveFranchiseId) return undefined;
    const matches = (agreementsQuery.data ?? []).filter(
      (agreement) =>
        agreement.type === "NEW_FRANCHISE" &&
        agreement.franchiseId === effectiveFranchiseId,
    );
    if (matches.length === 0) return undefined;
    return matches.reduce((left, right) => (left.id > right.id ? left : right)).id;
  }, [
    agreementsQuery.data,
    effectiveFranchiseId,
    hasExplicitAgreementId,
    explicitAgreementId,
  ]);
  const agreementDetailQuery = useAgreementMine(latestAgreementId);
  // True when the loaded agreement is a program-level (NEW_PROGRAM) one —
  // completion semantics differ from franchise onboarding (no franchise
  // activation expected; we just close and refresh program-scope queries).
  const isProgramAgreement = feeAgreement?.type === "NEW_PROGRAM";
  const installmentSummary =
    fullReceivablePlan ??
    feeAgreement?.receivables?.installmentSummary ??
    feeAgreement?.receivables?.paymentSummary ??
    null;

  // Pay-now headline for PaymentBreakdown / PaymentAction. For installment
  // agreements this is the initial payable (down payment or first EMI); for
  // non-installment agreements we fall back to the full franchise fee + GST.
  const installmentInitialPayable = (() => {
    type InstallmentItem = {
      paidAt?: string | null;
      label: string;
      payableAmount?: number;
      amount?: number;
      principalAmount?: number;
      gstAmount?: number;
      kind: "down-payment" | "installment";
    };
    type SummaryWithItem = { initialPayableItem?: InstallmentItem | null };
    const summary = installmentSummary as SummaryWithItem | null | undefined;
    if (!summary) return null;
    if ("initialPayableItem" in summary && summary.initialPayableItem) {
      const item = summary.initialPayableItem;
      if (item.paidAt) return null;
      return {
        label: item.label,
        amount: Number(item.payableAmount ?? item.amount ?? 0),
        principal: Number(item.principalAmount ?? item.amount ?? 0),
        gst: Number(item.gstAmount ?? 0),
        kind: item.kind,
      };
    }
    return null;
  })();
  const nonInstallmentPayable = (() => {
    if (installmentInitialPayable) return null;
    if (!feeAgreement?.franchiseFee || feeAgreement.franchiseFee <= 0)
      return null;
    const breakdown = getFranchiseFeePayable(
      feeAgreement.franchiseFee,
      feeAgreement.gstFranchiseFee ?? null,
    );
    return {
      label: "Franchise fee" as const,
      amount: breakdown.payable,
      principal: breakdown.base,
      gst: breakdown.gst,
    };
  })();
  const payableHeadline =
    installmentInitialPayable ?? nonInstallmentPayable;

  const renewalAgreementId = useMemo(() => {
    if (!feeAgreement || feeAgreement.status !== "Expired") return null;
    const list = agreementsQuery.data ?? [];
    const match = list.find(
      (a) =>
        a.type === "RENEWAL" &&
        ((((a.metadata as Record<string, unknown> | null)?.renewalOfAgreementId) ===
          feeAgreement.id) ||
          (a.programId === feeAgreement.programId && a.status === "Approved")),
    );
    return match?.id ?? null;
  }, [agreementsQuery.data, feeAgreement]);

  // Step 4 (Payment) unlocks once `agreement.signed === true`. Post-refactor,
  // signing flips the `signed` boolean while the agreement stays in `Approved`
  // status until payment lands — so the legacy `agreementSignatureSrc(...)`
  // check (which read the snapshotted signature URL on the agreement row)
  // is no longer the right gate. Fall back to it for pre-refactor data that
  // hasn't been migrated yet.
  const isSigned = Boolean(
    feeAgreement?.signed || (feeAgreement && agreementSignatureSrc(feeAgreement)),
  );

  const getMaxReachableStep = useCallback((): AgreementStepIndex => {
    if (!agreementAccepted) return 2;
    if (feeAgreementLoading || !feeAgreement) return 3;
    if (!isSigned) return 3;
    return 4;
  }, [agreementAccepted, feeAgreementLoading, feeAgreement, isSigned]);

  const canProceedFromStep = useCallback(
    (step: AgreementStepIndex): boolean => {
      switch (step) {
        case 1:
          return true;
        case 2:
          return agreementAccepted;
        case 3:
          if (feeAgreementLoading || !feeAgreement) return false;
          return isSigned;
        default:
          return true;
      }
    },
    [agreementAccepted, feeAgreementLoading, feeAgreement, isSigned],
  );

  const syncStepToUrl = useCallback(
    (step: AgreementStepIndex) => {
      const max = getMaxReachableStep();
      const clamped = Math.min(step, max) as AgreementStepIndex;
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", stepToQuery(clamped));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setCurrentStep(clamped);
    },
    [getMaxReachableStep, pathname, router, searchParams, setCurrentStep],
  );

  const refreshFranchiseeState = useCallback(async () => {
    if (!user || user.role !== "franchisee") {
      return isFranchiseOperational(user, franchiseIdParam);
    }

    const profileResponse = await getFranchiseeProfile();
    const raw =
      (profileResponse as { result?: Record<string, unknown> }).result ??
      (profileResponse as unknown as Record<string, unknown>);

    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid franchisee profile response");
    }

    const profile = normalizeFranchiseeProfile(raw);
    const currentFranchiseId = franchiseIdParam || user.franchiseId || "";
    const profileFranchiseStatus =
      profile.franchise?.status ?? user.franchiseStatus;
    // Operational standing is derived from agreements now.
    const isOperational =
      profile.franchise?.isOperational ??
      (profile.franchise?.validAgreementsCount ?? 0) > 0;
    const updatedFranchises = user.franchises?.map((franchise) =>
      franchise.id === currentFranchiseId
        ? { ...franchise, status: profileFranchiseStatus ?? franchise.status }
        : franchise,
    );

    setUser({
      ...user,
      franchiseId: currentFranchiseId,
      franchiseName: profile.franchise?.name ?? user.franchiseName,
      franchiseStatus: profileFranchiseStatus,
      isOperational,
      franchises: updatedFranchises ?? user.franchises,
      profile,
    });

    await queryClient.invalidateQueries({
      queryKey: queryKeys.auth.franchiseeProfile(currentFranchiseId),
    });

    return isOperational;
  }, [franchiseIdParam, queryClient, setUser, user]);

  const waitForActivation = useCallback(async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const operational = await refreshFranchiseeState();
      if (operational) return true;
      await sleep(1500);
    }
    return false;
  }, [refreshFranchiseeState]);

  const abandonActiveAgreementPayment = useCallback(async (note: string) => {
    const orderId = activePaymentOrderIdRef.current;
    if (!orderId || paymentSettledRef.current) return;
    paymentSettledRef.current = true;
    await abandonOrderPayment({
      razorpayOrderId: orderId,
      note,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleWindowClose = () => {
      void abandonActiveAgreementPayment("page_unload");
    };
    window.addEventListener("beforeunload", handleWindowClose);
    window.addEventListener("pagehide", handleWindowClose);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      window.removeEventListener("pagehide", handleWindowClose);
      void abandonActiveAgreementPayment("component_unmount");
    };
  }, [abandonActiveAgreementPayment]);

  useEffect(() => {
    if (user?.role === "admin") {
      router.push("/admin/dashboard");
      return;
    }

    // Operational franchises can still need to sign a NEW_PROGRAM agreement —
    // only redirect to the dashboard when the URL doesn't pin a specific agreement.
    if (isFranchiseOperational(user, franchiseIdParam) && !hasExplicitAgreementId) {
      router.push("/franchisee/dashboard");
      return;
    }

    if (franchiseIdParam && franchiseIdParam !== user?.franchiseId) {
      void switchFranchise(franchiseIdParam).catch((err) => {
        sendClientLog({ level: "error", event: "switch-franchise-error", message: "switchFranchise failed", context: { error: err } });
        setPageLoading(false);
      });
    }
  }, [
    franchiseIdParam,
    franchiseStatus,
    hasExplicitAgreementId,
    router,
    switchFranchise,
    user,
  ]);

  // Bug 1 fix: when a specific agreementId is pinned and that agreement has
  // already reached a terminal/active state (Valid, Suspended, Void) — or the
  // legacy equivalent `Signed` from pre-refactor data — there's nothing for
  // the franchisee to do here. Send them to the dashboard.
  // Note: Expired is intentionally excluded — it renders a dedicated
  // expired/renew view (AgreementExpiredView) rather than redirecting.
  useEffect(() => {
    if (!hasExplicitAgreementId) return;
    if (feeAgreementLoading) return;
    if (!feeAgreement) return;
    const terminalOrActiveStatuses = new Set<string>([
      "Valid",
      "Signed", // legacy alias for Valid prior to status refactor
      "Suspended",
      "Void",
    ]);
    if (terminalOrActiveStatuses.has(feeAgreement.status ?? "")) {
      router.replace("/franchisee/dashboard");
    }
  }, [
    feeAgreement,
    feeAgreementLoading,
    hasExplicitAgreementId,
    router,
  ]);

  useEffect(() => {
    setFullReceivablePlan(null);
  }, [effectiveFranchiseId]);

  // Eagerly load the full receivable plan when the agreement is available and
  // carries an installment plan — the new EmiTimeline needs item-level data
  // (down payment + each installment) to render the per-stop layout, and the
  // compact summary embedded on the agreement detail doesn't carry it.
  useEffect(() => {
    if (!feeAgreement?.id) return;
    if (fullReceivablePlan || fullReceivablePlanLoading) return;
    const hasPlan = Boolean(
      feeAgreement.receivables?.installmentSummary ||
        feeAgreement.receivables?.paymentSummary,
    );
    if (!hasPlan) return;
    void handleViewFullSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeAgreement?.id, fullReceivablePlan, fullReceivablePlanLoading]);

  useEffect(() => {
    if (!user?.profile || user.role === "admin" || !effectiveFranchiseId) {
      setFeeAgreement(null);
      setFeeAgreementLoading(false);
      return;
    }

    if (agreementsQuery.isLoading || (latestAgreementId != null && agreementDetailQuery.isLoading)) {
      setFeeAgreementLoading(true);
      return;
    }

    if (agreementDetailQuery.data) {
      setFeeAgreement(agreementDetailQuery.data);
    } else if (latestAgreementId == null) {
      setFeeAgreement(null);
    }

    setFeeAgreementLoading(false);
  }, [
    agreementDetailQuery.data,
    agreementDetailQuery.isLoading,
    agreementsQuery.isLoading,
    effectiveFranchiseId,
    latestAgreementId,
    user?.profile,
    user?.role,
  ]);

  useEffect(() => {
    if (pageLoading || !agreementContent) return;
    const parsed = queryToStep(searchParams.get("step"));
    if (parsed === null) return;
    const max = getMaxReachableStep();
    const capped = Math.min(parsed, max) as AgreementStepIndex;
    setCurrentStep((prev) => (capped !== prev ? capped : prev));
  }, [agreementContent, getMaxReachableStep, pageLoading, searchParams]);

  useEffect(() => {
    if (user?.role === "admin") return;
    // Operational franchises can still need to sign a NEW_PROGRAM agreement —
    // only bail when there's no explicit agreementId pinning us here.
    if (isFranchiseOperational(user, franchiseIdParam) && !hasExplicitAgreementId) return;

    const effectiveFranchiseId = franchiseIdParam || user?.franchiseId;

    if (franchiseIdParam && franchiseIdParam !== user?.franchiseId) {
      return;
    }

    if (!user?.profile) {
      setPageLoading(false);
      return;
    }

    if (user.profile.franchise === undefined) {
      setPageLoading(false);
      return;
    }

    if (effectiveFranchiseId !== user.franchiseId) {
      setPageLoading(false);
      return;
    }

    try {
      const franchiseData = buildFranchiseDataForAgreementPage(user, feeAgreement);
      setAgreementContent(getProcessedAgreementContent(franchiseData));
      setExpandedSections(new Set(["basic-terms", "financial-terms"]));
    } catch (error) {
      sendClientLog({ level: "error", event: "agreement-content-build-error", message: "Failed to build agreement content", context: { error } });
      setAgreementContent(null);
    } finally {
      setPageLoading(false);
    }
  }, [
    feeAgreement,
    franchiseIdParam,
    franchiseStatus,
    hasExplicitAgreementId,
    switchFranchise,
    user,
  ]);

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    setAgreementAccepted(checked === true);
  };

  // -- Step 3 signing actions (rendered in the footer beside Next) ----------
  // Plain functions — the file's convention. React Compiler memoizes for us.

  /** Run the same query-invalidation set after either sign path. */
  const invalidateAfterSign = async (agreementId: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agreements", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["agreements"] }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.detail(agreementId),
      }),
      queryClient.invalidateQueries({
        queryKey: ["auth", "franchisee-profile"],
      }),
    ]);
  };

  /** Apply the on-file signature to this agreement — one POST, no upload. */
  const handleSignWithStored = async () => {
    if (!feeAgreement || signing) return;
    setSigning(true);
    try {
      const updated = await submitFranchiseeSignatureWithStored(feeAgreement.id);
      setFeeAgreement(updated);
      await invalidateAfterSign(feeAgreement.id);
      toast.success("Signature applied — proceed to payment");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not apply signature"));
    } finally {
      setSigning(false);
    }
  };

  const openESignatureDialog = () => {
    setESignatureOpen(true);
  };

  /**
   * Adopt an in-browser e-signature (drawn or typed) and apply it to the
   * agreement. The backend persists the SVG to `franchisee.franchiseeSignature`
   * AND flips `agreement.signed=true`, so the next time this franchisee signs
   * anything they'll see the on-file branch.
   */
  const handleAdoptESignature = async (payload: ESignaturePayload) => {
    if (!feeAgreement) return;
    setSigning(true);
    try {
      const updated = await submitFranchiseeSignature(feeAgreement.id, payload);
      setFeeAgreement(updated);
      await invalidateAfterSign(feeAgreement.id);
      setESignatureOpen(false);
      toast.success("Signature saved — proceed to payment");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save signature"));
    } finally {
      setSigning(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const next = new Set(expandedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    setExpandedSections(next);
  };

  const expandAllSections = () => {
    if (agreementContent) {
      setExpandedSections(new Set(agreementContent.sections.map((section) => section.id)));
    }
  };

  const collapseAllSections = () => {
    setExpandedSections(new Set());
  };

  const handleDownloadPDF = async () => {
    if (!feeAgreement?.id) {
      toast.error(
        "No agreement record is available yet. Your Schedule B PDF will be ready once the agreement is issued.",
      );
      return;
    }
    try {
      await downloadScheduleBPdfMine(feeAgreement.id);
      toast.success("Schedule B PDF download started");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to download Schedule B PDF"));
    }
  };

  const handlePaymentSubmit = async () => {
    if (!agreementAccepted) {
      toast.error("Please accept the terms and conditions before proceeding.");
      return;
    }

    if (!feeAgreement?.id) {
      toast.error("Your agreement is still being prepared. Please try again later.");
      return;
    }

    if (!isSigned) {
      toast.error("Please sign the agreement before starting payment.");
      return;
    }

    setIsProcessingPayment(true);
    paymentSettledRef.current = false;
    activePaymentOrderIdRef.current = null;

    try {
      const payableAmount = resolveAgreementPayableAmount(
        feeAgreement,
        user?.profile?.franchise?.franchisePayroll
          ? [user.profile.franchise.franchisePayroll]
          : [],
      );

      if (payableAmount === null) {
        toast.error(
          "Could not determine your agreement payment amount. Please refresh the page or contact support.",
        );
        return;
      }

      const paymentOrder = await initiateAgreementFeePayment(feeAgreement.id);
      if (paymentOrder.isZeroAmount || paymentOrder.amount <= 0) {
        toast.error(
          "Online payment is not ready for this agreement yet. Please contact support.",
        );
        return;
      }

      setPaymentDetails({
        orderId: paymentOrder.orderId,
        amount: paymentOrder.amount || payableAmount,
        currency: paymentOrder.currency,
        franchiseName: paymentOrder.franchiseName,
        key: paymentOrder.key,
      });
      activePaymentOrderIdRef.current = paymentOrder.orderId;
    } catch (error) {
      sendClientLog({ level: "error", event: "agreement-payment-initiate-error", message: "Error initiating agreement payment", context: { error } });
      toast.error(getErrorMessage(error, "Failed to initiate payment."));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleViewFullSchedule = async () => {
    if (!feeAgreement?.id || fullReceivablePlanLoading) return;
    setFullReceivablePlanLoading(true);
    try {
      const plan = await getReceivablePlanMine(feeAgreement.id);
      setFullReceivablePlan(plan);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load EMI schedule"));
    } finally {
      setFullReceivablePlanLoading(false);
    }
  };

  const handlePaymentSuccess = async (response: RazorpaySuccessResponse) => {
    paymentSettledRef.current = true;
    setIsProcessingPayment(true);
    setActivationSyncing(true);

    try {
      const verificationResult = await verifyFranchiseFeePayment({
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      });

      const verified =
        verificationResult.ok === true ||
        verificationResult.message === "Payment verified successfully";

      if (!verified) {
        throw new Error("Payment verification failed");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agreements", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["agreements"] }),
        queryClient.invalidateQueries({ queryKey: ["program-requests"] }),
        // The switcher reads agreements from `profile.franchise.activePrograms`,
        // so the profile MUST be refetched after payment — otherwise the
        // freshly-activated program stays "Approved" in the switcher even
        // though the backend flipped it to Valid.
        queryClient.invalidateQueries({
          queryKey: ["auth", "franchisee-profile"],
        }),
        feeAgreement?.id
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.agreements.detail(feeAgreement.id),
            })
          : Promise.resolve(),
      ]);

      // For a NEW_PROGRAM agreement the franchise is already Active — there's
      // no activation poll to do. Show the success card briefly, then route
      // back to the dashboard. Franchise onboarding still polls below.
      if (isProgramAgreement) {
        setShowPaymentSuccess(true);
        setTimeout(() => {
          router.push("/franchisee/dashboard");
        }, 2000);
        return;
      }

      const activated = await waitForActivation();
      if (!activated) {
        toast.success("Payment verified. Activation is still syncing, please refresh shortly.");
        await refreshFranchiseeState();
        return;
      }

      setShowPaymentSuccess(true);
      setTimeout(() => {
        router.push("/franchisee/dashboard");
      }, 3000);
    } catch (error) {
      sendClientLog({ level: "error", event: "agreement-payment-verify-error", message: "Error verifying agreement payment", context: { error } });
      toast.error(getErrorMessage(error, "Payment verification failed."));
    } finally {
      setActivationSyncing(false);
      setIsProcessingPayment(false);
      setPaymentDetails(null);
      activePaymentOrderIdRef.current = null;
    }
  };

  const handlePaymentFailure = async (error: unknown) => {
    sendClientLog({ level: "error", event: "agreement-payment-failure", message: "Agreement payment failed", context: { error } });
    toast.error("Payment failed. Please try again.");
    setActivationSyncing(false);
    setIsProcessingPayment(false);
    setPaymentDetails(null);
    activePaymentOrderIdRef.current = null;
  };

  const goNext = () => {
    if (!canProceedFromStep(currentStep)) {
      if (currentStep === 2) {
        toast.error("Please accept the terms to continue.");
      }
      if (currentStep === 3) {
        toast.error(
          feeAgreementLoading
            ? "Please wait for your agreement record to load."
            : !feeAgreement
              ? "Your agreement is still being prepared."
              : "Please upload your signature to continue.",
        );
      }
      return;
    }

    const next = Math.min(4, currentStep + 1) as AgreementStepIndex;
    syncStepToUrl(next);
  };

  const goBack = () => {
    const previous = Math.max(1, currentStep - 1) as AgreementStepIndex;
    syncStepToUrl(previous);
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="rounded-2xl border bg-card px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Loading your franchise agreement...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !user.profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="rounded-2xl border bg-card px-6 py-5 text-center shadow-sm">
          <p className="text-sm text-destructive">
            Unable to load franchise data. Please try logging in again.
          </p>
          <Button onClick={() => router.push("/login")} className="mt-4 rounded-lg">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // The agreement detail loads after the page chrome is ready (pageLoading is
  // cleared once agreementContent is built from the profile, independent of the
  // agreement record). Until the record resolves we can't tell whether to show
  // the expired view or the sign+pay stepper — keep the loader up rather than
  // briefly flashing the stepper and then swapping to the expired view.
  if (feeAgreementLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="rounded-2xl border bg-card px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Loading your franchise agreement...
          </p>
        </div>
      </div>
    );
  }

  if (feeAgreement?.status === "Expired") {
    return (
      <AgreementExpiredView
        agreement={feeAgreement}
        renewalAgreementId={renewalAgreementId}
      />
    );
  }

  if (!feeAgreement && !feeAgreementLoading && !isFranchiseOperational(user, franchiseIdParam)) {
    const waitingMessage =
      franchiseStatus === "Approved"
        ? "Your agreement is being prepared. You will be able to sign and pay here as soon as it is issued."
        : "Your application is still waiting for admin review. Agreement and payment steps will unlock after approval.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="border-b bg-accent/30 px-5 py-5 text-left">
            <CardTitle className="text-2xl font-normal text-card-foreground">
              {franchiseStatus === "Approved"
                ? "Agreement is being prepared"
                : "Application under review"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <p className="text-sm text-muted-foreground">{waitingMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.profile.franchise === undefined || !agreementContent) {
    return null;
  }

  const franchiseData = buildFranchiseDataForAgreementPage(
    user,
    feeAgreement,
  ) as Parameters<typeof FranchiseeInformation>[0]["franchiseData"];

  if (showPaymentSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="border-b bg-accent/30 px-5 py-5 text-left">
            <div className="mb-4 flex">
              <div className="rounded-full border border-primary/20 bg-primary/10 p-3">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-normal text-card-foreground">
              {isProgramAgreement
                ? "Program activated!"
                : "Welcome to Abacus Family!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <p className="mb-4 text-sm text-muted-foreground">
              {isProgramAgreement
                ? "Your program agreement is signed and the payment is verified. The program scope is now active for your franchise."
                : "Your agreement and payment are complete, and your franchise has been activated. You now have full access to your franchise dashboard."}
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your dashboard in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const signatureHint = activationSyncing
    ? "Payment verified. Waiting for activation to sync..."
    : feeAgreementLoading
      ? "Loading your agreement record..."
      : !feeAgreement
        ? "Your agreement is still being prepared."
        : !isSigned
          ? "Please sign the agreement before starting payment."
          : null;

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-5 lg:px-6">
      {currentStep === 4 && paymentDetails ? (
        <ComponentErrorBoundary componentName="RazorpayPayment">
          <RazorpayPayment
            key={paymentDetails.orderId}
            orderId={paymentDetails.orderId}
            amount={paymentDetails.amount}
            currency={paymentDetails.currency}
            franchiseName={paymentDetails.franchiseName}
            razorpayKey={paymentDetails.key}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
            onAbandon={async ({ reason }) => {
              await abandonActiveAgreementPayment(reason);
            }}
            userDetails={{
              name: user.profile.name,
              email: user.profile.mail,
              phone: user.profile.phone,
            }}
          />
        </ComponentErrorBoundary>
      ) : null}

      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-5 sm:px-5">
            <div className="mb-3">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                {isProgramAgreement ? "Program agreement" : "Franchisee onboarding"}
              </span>
            </div>
            <h1 className="text-2xl font-normal tracking-tight text-card-foreground">
              {isProgramAgreement ? "Program Agreement" : "Franchisee Agreement"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {isProgramAgreement
                ? "Complete each step in order: review the program terms, accept them, sign the agreement, then pay to activate this program."
                : "Complete each step in order: review your details, accept the terms, sign the agreement, then pay to activate your franchise."}
            </p>
          </div>

          <div className="border-b border-border bg-accent/30 px-4 py-4 sm:px-5">
            <AgreementStepper currentStep={currentStep} />
          </div>

          <div className="p-4 sm:p-5">
            {currentStep === 1 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-normal text-card-foreground">
                  Review your details
                </h2>
                <p className="text-sm text-muted-foreground">
                  Confirm the information below matches your approved application.
                </p>
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
                  <FranchiseeInformation franchiseData={franchiseData} />
                  <LocationDetails franchiseData={franchiseData} />
                  <FranchiseDetails franchiseData={franchiseData} />
                </div>
                <PaymentBreakdown
                  paymentDetails={franchiseData.paymentDetails}
                  installmentSummary={installmentSummary}
                />
                <EmiTimeline
                  summary={installmentSummary}
                  gstFranchiseFee={feeAgreement?.gstFranchiseFee ?? null}
                  title="Your franchise fee EMI plan"
                  agreementRef={
                    feeAgreement?.id ? `Agreement #${feeAgreement.id}` : null
                  }
                />
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="space-y-3">
                <h2 className="text-xl font-normal text-card-foreground">
                  Terms and conditions
                </h2>
                <p className="text-sm text-muted-foreground">
                  Read the agreement sections and confirm acceptance below.
                </p>
                <AgreementTerms
                  agreementContent={agreementContent}
                  expandedSections={expandedSections}
                  agreementAccepted={agreementAccepted}
                  onToggleSection={toggleSection}
                  onExpandAll={expandAllSections}
                  onCollapseAll={collapseAllSections}
                  onDownloadPDF={handleDownloadPDF}
                  onAgreementChange={handleCheckboxChange}
                />
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-normal text-card-foreground">
                  Your signature
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isSigned
                    ? "Your signature is on this agreement. Continue to payment to activate."
                    : franchiseeProfileSignatureSrc(
                          user?.profile?.franchiseeSignature,
                        )
                      ? "Apply your on-file signature to this agreement, or upload a new one."
                      : "Upload your signature to sign this agreement. Payment unlocks after signing."}
                </p>
                <FranchiseAgreementSignaturePanel
                  agreement={feeAgreement}
                  loading={feeAgreementLoading}
                />
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Step 4 of 4 · Final step
                  </p>
                  <h2 className="mt-1 text-2xl font-normal text-card-foreground">
                    {installmentInitialPayable
                      ? "Confirm and pay"
                      : "Confirm and pay"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {installmentInitialPayable
                      ? `Settle the ${installmentInitialPayable.kind === "down-payment" ? "down payment" : "first installment"} to activate your franchise. The remaining principal is collected over the EMI schedule below.`
                      : "Complete the agreement payment to activate your franchise. Activation is confirmed after payment is verified."}
                  </p>
                </div>

                <EmiTimeline
                  summary={installmentSummary}
                  gstFranchiseFee={feeAgreement?.gstFranchiseFee ?? null}
                  title="Your payment plan"
                  agreementRef={
                    feeAgreement?.id ? `Agreement #${feeAgreement.id}` : null
                  }
                />

                <PaymentAction
                  agreementAccepted={agreementAccepted}
                  isProcessingPayment={isProcessingPayment || activationSyncing}
                  onPaymentSubmit={handlePaymentSubmit}
                  signatureHint={signatureHint}
                  variant="final"
                  payableAmount={payableHeadline?.amount ?? null}
                  payablePrincipal={payableHeadline?.principal ?? null}
                  payableGst={payableHeadline?.gst ?? null}
                  payableLabel={payableHeadline?.label ?? null}
                />

                <div>
                  <h3 className="text-base font-medium text-card-foreground">
                    What happens after you pay
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <PostPayStep
                      step="Step 1"
                      title="Payment verified"
                      description="Usually within 2 minutes of a successful transaction."
                    />
                    <PostPayStep
                      step="Step 2"
                      title="Franchise dashboard opens"
                      description="You'll be redirected automatically — no extra steps."
                    />
                    <PostPayStep
                      step="Step 3"
                      title="Welcome email sent"
                      description="Receipt, GST invoice and onboarding playbook."
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className={cn("mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between")}>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-border sm:order-1"
                onClick={goBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentStep < 4 ? (
                <div className="flex flex-col gap-2 sm:order-2 sm:flex-row sm:items-center">
                  {/*
                    Step 3 sign action sits BESIDE Next (per UX spec). Which
                    button shows is data-driven, mutually exclusive:
                      - signed already → no sign button (Next is live)
                      - has on-file signature → "Sign with this signature"
                      - no on-file signature → "Sign agreement" (opens e-sig pad)
                    The Next button stays visible throughout so the user has a
                    consistent forward affordance; it goes live as soon as
                    signing completes (isSigned flips true via setFeeAgreement).
                  */}
                  {currentStep === 3 &&
                  !isSigned &&
                  feeAgreement?.status === "Approved" ? (
                    franchiseeProfileSignatureSrc(
                      user?.profile?.franchiseeSignature,
                    ) ? (
                      <Button
                        type="button"
                        className="rounded-lg"
                        onClick={() => void handleSignWithStored()}
                        disabled={signing || feeAgreementLoading}
                      >
                        {signing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PenLine className="mr-2 h-4 w-4" />
                        )}
                        Sign
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="rounded-lg"
                        onClick={openESignatureDialog}
                        disabled={signing || feeAgreementLoading}
                      >
                        {signing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PenLine className="mr-2 h-4 w-4" />
                        )}
                        Sign agreement
                      </Button>
                    )
                  ) : null}

                  <Button
                    type="button"
                    className="rounded-lg"
                    onClick={goNext}
                    disabled={signing}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <ESignaturePad
        open={eSignatureOpen}
        onOpenChange={setESignatureOpen}
        defaultName={user?.profile?.name ?? user?.name ?? ""}
        onAdopt={handleAdoptESignature}
        submitting={signing}
      />
    </div>
  );
}

export default function FranchiseAgreementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="rounded-2xl border bg-card px-6 py-5 text-center shadow-sm">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <FranchiseAgreementContent />
    </Suspense>
  );
}

function PostPayStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {step}
      </span>
      <p className="mt-3 text-sm font-medium text-card-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
