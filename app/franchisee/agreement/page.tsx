"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
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
import { InstallmentSummaryCard } from "@/components/receivables/InstallmentSummaryCard";
import { FranchiseAgreementSignaturePanel } from "./components/FranchiseAgreementSignaturePanel";
import {
  AgreementStepper,
  queryToStep,
  stepToQuery,
  type AgreementStepIndex,
} from "./components/AgreementStepper";
import RazorpayPayment, {
  type RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";
import {
  initiateAgreementFeePayment,
  verifyFranchiseFeePayment,
} from "@/services/franchisee.service";
import {
  agreementSignatureSrc,
  downloadScheduleBPdfMine,
  getReceivablePlanMine,
  type AgreementRecord,
  type ReceivableInstallmentSummary,
} from "@/services/agreement.service";
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
import { getEffectiveFranchiseStatus } from "@/lib/auth";
import { abandonOrderPayment } from "@/services/order.service";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function FranchiseAgreementContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const franchiseIdParam = searchParams.get("franchiseId");
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
    if (!effectiveFranchiseId) return undefined;
    const matches = (agreementsQuery.data ?? []).filter(
      (agreement) =>
        agreement.type === "NEW_FRANCHISE" &&
        agreement.franchiseId === effectiveFranchiseId,
    );
    if (matches.length === 0) return undefined;
    return matches.reduce((left, right) => (left.id > right.id ? left : right)).id;
  }, [agreementsQuery.data, effectiveFranchiseId]);
  const agreementDetailQuery = useAgreementMine(latestAgreementId);
  const installmentSummary =
    fullReceivablePlan ??
    feeAgreement?.receivables?.installmentSummary ??
    feeAgreement?.receivables?.paymentSummary ??
    null;

  const getMaxReachableStep = useCallback((): AgreementStepIndex => {
    if (!agreementAccepted) return 2;
    if (feeAgreementLoading || !feeAgreement) return 3;
    if (!agreementSignatureSrc(feeAgreement)) return 3;
    return 4;
  }, [agreementAccepted, feeAgreementLoading, feeAgreement]);

  const canProceedFromStep = useCallback(
    (step: AgreementStepIndex): boolean => {
      switch (step) {
        case 1:
          return true;
        case 2:
          return agreementAccepted;
        case 3:
          if (feeAgreementLoading || !feeAgreement) return false;
          return Boolean(agreementSignatureSrc(feeAgreement));
        default:
          return true;
      }
    },
    [agreementAccepted, feeAgreementLoading, feeAgreement],
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
      return franchiseStatus ?? "";
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
      franchises: updatedFranchises ?? user.franchises,
      profile,
    });

    await queryClient.invalidateQueries({
      queryKey: queryKeys.auth.franchiseeProfile(currentFranchiseId),
    });

    return profileFranchiseStatus ?? "";
  }, [franchiseIdParam, franchiseStatus, queryClient, setUser, user]);

  const waitForActivation = useCallback(async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const status = await refreshFranchiseeState();
      if (status === "Active") return true;
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

    if (franchiseStatus === "Active") {
      router.push("/franchisee/dashboard");
      return;
    }

    if (franchiseIdParam && franchiseIdParam !== user?.franchiseId) {
      void switchFranchise(franchiseIdParam).catch((err) => {
        console.error("switchFranchise failed:", err);
        setPageLoading(false);
      });
    }
  }, [franchiseIdParam, franchiseStatus, router, switchFranchise, user]);

  useEffect(() => {
    setFullReceivablePlan(null);
  }, [effectiveFranchiseId]);

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
    if (user?.role === "admin" || franchiseStatus === "Active") return;

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
      console.error("Failed to build agreement content:", error);
      setAgreementContent(null);
    } finally {
      setPageLoading(false);
    }
  }, [feeAgreement, franchiseIdParam, franchiseStatus, switchFranchise, user]);

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    setAgreementAccepted(checked === true);
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

    if (!agreementSignatureSrc(feeAgreement)) {
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
      console.error("Error initiating payment:", error);
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
        feeAgreement?.id
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.agreements.detail(feeAgreement.id),
            })
          : Promise.resolve(),
      ]);

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
      console.error("Error verifying payment:", error);
      toast.error(getErrorMessage(error, "Payment verification failed."));
    } finally {
      setActivationSyncing(false);
      setIsProcessingPayment(false);
      setPaymentDetails(null);
      activePaymentOrderIdRef.current = null;
    }
  };

  const handlePaymentFailure = async (error: unknown) => {
    console.error("Payment failed:", error);
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

  if (!feeAgreement && !feeAgreementLoading && franchiseStatus !== "Active") {
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
              Welcome to Abacus Family!
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <p className="mb-4 text-sm text-muted-foreground">
              Your agreement and payment are complete, and your franchise has been
              activated. You now have full access to your franchise dashboard.
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
        : !agreementSignatureSrc(feeAgreement)
          ? "Please upload your signature before starting payment."
          : null;

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-5 lg:px-6">
      {currentStep === 4 && paymentDetails ? (
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
      ) : null}

      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-5 sm:px-5">
            <div className="mb-3">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                Franchisee onboarding
              </span>
            </div>
            <h1 className="text-2xl font-normal tracking-tight text-card-foreground">
              Franchisee Agreement
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Complete each step in order: review your details, accept the terms,
              sign the agreement, then pay to activate your franchise.
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
                <FranchiseeInformation franchiseData={franchiseData} />
                <LocationDetails franchiseData={franchiseData} />
                <FranchiseDetails franchiseData={franchiseData} />
                <PaymentBreakdown paymentDetails={franchiseData.paymentDetails} />
                <InstallmentSummaryCard
                  summary={installmentSummary}
                  title="Your franchise fee EMI split-up"
                  onViewFullSchedule={
                    feeAgreement?.id && !fullReceivablePlan
                      ? () => void handleViewFullSchedule()
                      : undefined
                  }
                  viewFullScheduleLabel={
                    fullReceivablePlanLoading
                      ? "Loading schedule..."
                      : "View full schedule"
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
                  Upload your signature when the agreement reaches pending-signature
                  status. Payment will unlock only after signing.
                </p>
                <FranchiseAgreementSignaturePanel
                  agreement={feeAgreement}
                  loading={feeAgreementLoading}
                  onAgreementUpdated={setFeeAgreement}
                />
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-normal text-card-foreground">
                  Final step - payment
                </h2>
                <p className="text-sm text-muted-foreground">
                  Complete your agreement payment after signing. Activation happens
                  after the backend verifies the payment.
                </p>
                <InstallmentSummaryCard
                  summary={installmentSummary}
                  title="Payable schedule"
                  onViewFullSchedule={
                    feeAgreement?.id && !fullReceivablePlan
                      ? () => void handleViewFullSchedule()
                      : undefined
                  }
                  viewFullScheduleLabel={
                    fullReceivablePlanLoading
                      ? "Loading schedule..."
                      : "View full schedule"
                  }
                />
                <PaymentAction
                  agreementAccepted={agreementAccepted}
                  isProcessingPayment={isProcessingPayment || activationSyncing}
                  onPaymentSubmit={handlePaymentSubmit}
                  signatureHint={signatureHint}
                  variant="final"
                />
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
                <Button
                  type="button"
                  className="rounded-lg sm:order-2"
                  onClick={goNext}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
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
