"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  CheckCircle,
  Clock,
  Loader2,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ciSignatureSrc,
  getCIAgreement,
  signCIAgreementWithESignature,
  signCIAgreementWithStored,
  updateCIAgreementSignature,
  type CIAgreementRecord,
  type CIESignaturePayload,
} from "@/services/ci-training.service";
import type { ESignatureResult } from "@/components/esignature/ESignaturePad";

import { ciAgreementContent } from "@/lib/ciAgreementContent";
import AgreementTerms from "@/components/agreements/AgreementTerms";
import { useCIAuth } from "@/context/ci-auth-context";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import { formatDate } from "@/lib/date-utils";
import { Stepper } from "@/components/shared/stepper";
import { CI_AGREEMENT_STEPS } from "@/lib/constants/education";
import { SignatureCapturePanel } from "@/components/esignature/SignatureCapturePanel";

// ─── Types ────────────────────────────────────────────────────────────────────

type CIStepIndex = 1 | 2 | 3;
const CI_STEP_LABELS = ["Review", "Terms", "Sign"] as const;
const CI_STEP_QUERY = ["review", "terms", "sign"] as const;

function stepToQuery(step: CIStepIndex) {
  return CI_STEP_QUERY[step - 1];
}
function queryToStep(q: string | null): CIStepIndex | null {
  const i = CI_STEP_QUERY.indexOf(q as (typeof CI_STEP_QUERY)[number]);
  return i >= 0 ? ((i + 1) as CIStepIndex) : null;
}



// ─── Signature Step ───────────────────────────────────────────────────────────

function SignatureStep({
  agreement,
  onSigned,
  onGoToPortal,
  defaultSignerName,
  onCISign,
}: {
  agreement: CIAgreementRecord;
  onSigned: () => void;
  onGoToPortal: () => void;
  defaultSignerName: string;
  onCISign?: (result: ESignatureResult) => Promise<void>;
}) {
  const [signing, setSigning] = useState(false);

  const existingSigSrc = ciSignatureSrc(agreement.ciSignatureUrl);

  const handleAdoptESignature = async (payload: CIESignaturePayload) => {
    setSigning(true);
    try {
      await signCIAgreementWithESignature(agreement.id, payload);
      toast.success("Agreement signed successfully.");
      onSigned();
    } catch {
      toast.error("Could not save signature. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  const handleSignWithStored = async () => {
    setSigning(true);
    try {
      await signCIAgreementWithStored(agreement.id);
      toast.success("Agreement signed successfully.");
      onSigned();
    } catch {
      toast.error("Could not apply signature. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  if (agreement.phase === "SIGNED") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-medium text-card-foreground">Agreement Signed</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your Course Instructor Agreement is fully signed and active.
        </p>
        {agreement.dateOfSigning && (
          <p className="mt-1 text-xs text-muted-foreground">
            Signed on {formatDate(agreement.dateOfSigning)}
          </p>
        )}
        {agreement.tenure != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            {agreement.tenure}-month tenure
            {agreement.expiresAt ? ` · Expires ${formatDate(agreement.expiresAt)}` : ""}
          </p>
        )}
        <Button className="mt-5" onClick={onGoToPortal}>
          Go to portal
        </Button>
      </div>
    );
  }

  if (agreement.phase === "PENDING_FRANCHISEE_SIGNATURE") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-medium text-card-foreground">Waiting for Franchisee</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You have signed the agreement. Your franchisee needs to countersign before it becomes active.
          </p>
        </div>
        {!ciSignatureSrc(agreement.ciSignatureUrl) && onCISign && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-sm text-muted-foreground">
              Your signature was not captured. Add it now using draw or type.
            </p>
            <SignatureCapturePanel
              signerLabel="Your signature"
              ctaLabel="Add Signature"
              busy={signing}
              defaultName={defaultSignerName}
              onAdopt={async (r) => {
                setSigning(true);
                try {
                  await onCISign(r);
                } finally {
                  setSigning(false);
                }
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <SignatureCapturePanel
        storedSignature={existingSigSrc ?? undefined}
        signerLabel="Your signature"
        ctaLabel="Sign agreement"
        busy={signing}
        defaultName={defaultSignerName}
        onAdopt={handleAdoptESignature}
        onUseStored={() => void handleSignWithStored()}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CIAgreementContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { refresh } = useCIAuth();

  const [currentStep, setCurrentStep] = useState<CIStepIndex>(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { data: agreement, refetch, isLoading } = useQuery({
    queryKey: ["ci-agreement"],
    queryFn: getCIAgreement,
  });

  const syncStepToUrl = useCallback(
    (step: CIStepIndex) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", stepToQuery(step));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setCurrentStep(step);
    },
    [pathname, router, searchParams],
  );

  // Restore step from URL on load
  useEffect(() => {
    const parsed = queryToStep(searchParams.get("step"));
    if (parsed !== null) setCurrentStep(parsed);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If agreement is already past PENDING_CI_SIGNATURE, lock to step 3
  useEffect(() => {
    if (!agreement) return;
    if (
      agreement.phase === "PENDING_FRANCHISEE_SIGNATURE" ||
      agreement.phase === "SIGNED"
    ) {
      setCurrentStep(3);
    }
  }, [agreement?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const canProceed = (step: CIStepIndex) => {
    if (step === 1) return true;
    if (step === 2) return termsAccepted;
    return false;
  };

  const goNext = () => {
    if (!canProceed(currentStep)) {
      if (currentStep === 2) toast.error("Please accept the terms to continue.");
      return;
    }
    const next = Math.min(3, currentStep + 1) as CIStepIndex;
    syncStepToUrl(next);
  };

  const goBack = () => {
    const prev = Math.max(1, currentStep - 1) as CIStepIndex;
    syncStepToUrl(prev);
  };

  const handleSigned = async () => {
    await refetch();
    await refresh();
  };

  const handleCISign = async (result: ESignatureResult) => {
    if (!agreement) return;
    const payload: CIESignaturePayload = result;
    try {
      await updateCIAgreementSignature(agreement.id, payload);
      toast.success("Signature saved");
      await refetch();
      await refresh();
    } catch {
      toast.error("Failed to save signature. Please try again.");
    }
  };

  const toggleSection = (id: string) =>
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const expandAll = () =>
    setExpandedSections(new Set(ciAgreementContent.sections.map((s) => s.id)));
  const collapseAll = () => setExpandedSections(new Set());

  // ── Loading / empty states ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="rounded-2xl border bg-card px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your agreement…</p>
        </div>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="border-b bg-accent/30 px-5 py-5">
            <CardTitle className="text-xl font-normal text-card-foreground">
              Agreement pending
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <p className="text-sm text-muted-foreground">
              No agreement has been issued yet. It will appear here after admin approval.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (agreement.phase === "SIGNED") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Your Course Instructor Agreement is fully signed and active.
        </div>
        <CIAgreementDetail
          agreement={agreement}
          onCISign={!ciSignatureSrc(agreement.ciSignatureUrl) ? handleCISign : undefined}
        />
      </div>
    );
  }

  if (agreement.phase === "EXPIRED") {
    return agreement.status === "Void" ? (
      <CIAgreementVoidView />
    ) : (
      <CIAgreementExpiredView agreement={agreement} />
    );
  }

  // ── Shell ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-5 lg:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

          {/* Header */}
          <div className="border-b border-border px-4 py-5 sm:px-5">
            <div className="mb-3">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                Course Instructor Onboarding
              </span>
            </div>
            <h1 className="text-2xl font-normal tracking-tight text-card-foreground">
              Course Instructor Agreement
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {agreement.phase === "PENDING_FRANCHISEE_SIGNATURE"
                ? "You have signed the agreement. It becomes active once your franchisee countersigns."
                : "Complete each step in order: review your details, accept the terms, then sign the agreement."}
            </p>
          </div>

          {/* Stepper */}
          <div className="border-b border-border bg-accent/30 px-4 py-4 sm:px-5">
            <Stepper steps={CI_AGREEMENT_STEPS} currentStep={currentStep} compact framed={false} />
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5">

            {/* Step 1 — Review */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-normal text-card-foreground">Review your details</h2>
                <p className="text-sm text-muted-foreground">
                  Confirm the information below matches your approved application.
                </p>
                <CIAgreementDetail agreement={agreement} hideAgreementTerms />
              </div>
            )}

            {/* Step 2 — Terms */}
            {currentStep === 2 && (
              <div className="space-y-3">
                <h2 className="text-xl font-normal text-card-foreground">Terms and conditions</h2>
                <p className="text-sm text-muted-foreground">
                  Read the agreement sections and confirm acceptance below.
                </p>
                <AgreementTerms
                  agreementContent={ciAgreementContent}
                  expandedSections={expandedSections}
                  agreementAccepted={termsAccepted}
                  onToggleSection={toggleSection}
                  onExpandAll={expandAll}
                  onCollapseAll={collapseAll}
                  onDownloadPDF={() => toast.info("PDF download is not available yet.")}
                  onAgreementChange={(v) => setTermsAccepted(v === true)}
                />
              </div>
            )}

            {/* Step 3 — Sign */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-normal text-card-foreground">
                  {agreement.phase === "PENDING_FRANCHISEE_SIGNATURE"
                    ? "Agreement submitted"
                    : "Your signature"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {agreement.phase === "PENDING_FRANCHISEE_SIGNATURE"
                    ? "Your signature has been recorded. The agreement becomes active once your franchisee countersigns."
                    : "Upload your signature to sign the agreement. The agreement becomes active after your franchisee countersigns."}
                </p>
                <SignatureStep
                  agreement={agreement}
                  onSigned={handleSigned}
                  onGoToPortal={() => router.push("/ci/dashboard")}
                  defaultSignerName={agreement.instructor?.name ?? ""}
                  onCISign={!ciSignatureSrc(agreement.ciSignatureUrl) ? handleCISign : undefined}
                />
              </div>
            )}

            {/* Navigation */}
            {agreement.phase !== "PENDING_FRANCHISEE_SIGNATURE" && (
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
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
                {currentStep < 3 && (
                  <Button
                    type="button"
                    className="rounded-lg sm:order-2"
                    onClick={goNext}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Shown after login when the CI's agreement has expired (phase EXPIRED).
 * Mirrors the franchisee AgreementExpiredView, but CI renewals are admin-driven
 * (no signing or payment by the CI), so this is purely informational.
 */
function CIAgreementExpiredView({ agreement }: { agreement: CIAgreementRecord }) {
  const expiredOn = agreement.expiresAt
    ? formatDate(agreement.expiresAt)
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="border-b bg-accent/30 px-5 py-5 text-left">
          <div className="mb-3">
            <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-destructive">
              Expired
            </span>
          </div>
          <CardTitle className="flex items-center gap-2 text-2xl font-normal text-card-foreground">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Agreement expired
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <p className="text-sm text-muted-foreground">
            Your Course Instructor Agreement
            {expiredOn ? (
              <> expired on <span className="font-medium text-card-foreground">{expiredOn}</span>.</>
            ) : (
              <> has expired.</>
            )}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Your renewal is being prepared by Abacus. Once it&apos;s renewed you&apos;ll regain
            access automatically — no signing or payment is required on your part. Please check
            back soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Shown after login when the CI's agreement has been voided (status Void).
 * Void is a deliberate, permanent termination by Abacus — unlike an expiry,
 * it is not renewed automatically, so the CI is directed to contact Abacus.
 */
function CIAgreementVoidView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="border-b bg-accent/30 px-5 py-5 text-left">
          <div className="mb-3">
            <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-destructive">
              Terminated
            </span>
          </div>
          <CardTitle className="flex items-center gap-2 text-2xl font-normal text-card-foreground">
            <Ban className="h-6 w-6 text-destructive" />
            Agreement terminated
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <p className="text-sm text-muted-foreground">
            Your Course Instructor Agreement has been terminated and is no longer active.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            If you believe this is a mistake, please contact Abacus to resolve it. Access cannot
            be restored from here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CIAgreementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="rounded-2xl border bg-card px-6 py-5 text-center shadow-sm">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      }
    >
      <CIAgreementContent />
    </Suspense>
  );
}
