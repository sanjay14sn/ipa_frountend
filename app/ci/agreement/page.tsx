"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Clock,
  Loader2,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getCIAgreement,
  signCIAgreementWithESignature,
  type CIAgreementRecord,
  type CIESignaturePayload,
} from "@/services/ci-training.service";
import type { ESignaturePadProps } from "@/components/esignature/ESignaturePad";

const ESignaturePad = dynamic<ESignaturePadProps>(
  () =>
    import("@/components/esignature/ESignaturePad").then((m) => ({
      default: m.ESignaturePad,
    })),
  { ssr: false, loading: () => null },
);
import { ciAgreementContent } from "@/lib/ciAgreementContent";
import AgreementTerms from "@/app/franchisee/agreement/components/AgreementTerms";
import { useCIAuth } from "@/context/ci-auth-context";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import { fmtDate } from "@/lib/date-utils";

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


// ─── Stepper ──────────────────────────────────────────────────────────────────

function CIAgreementStepper({ currentStep }: { currentStep: CIStepIndex }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {CI_STEP_LABELS.map((label, index) => {
          const id = (index + 1) as CIStepIndex;
          const done = currentStep > id;
          const active = currentStep === id;
          return (
            <div key={id} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-all duration-200",
                    (active || done) &&
                      "border-primary bg-primary text-primary-foreground shadow-sm",
                    !active && !done && "border-border bg-card text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : id}
                </div>
                <p
                  className={cn(
                    "mt-2 text-[10px] font-medium leading-tight sm:text-xs",
                    currentStep >= id ? "text-card-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </p>
              </div>
              {index < CI_STEP_LABELS.length - 1 && (
                <div className="flex max-w-[40px] flex-1 items-center justify-center px-1 sm:max-w-[60px] sm:px-2">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-all duration-200",
                      done ? "bg-primary" : "bg-border",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Signature Step ───────────────────────────────────────────────────────────

function SignatureStep({
  agreement,
  onSigned,
  onGoToPortal,
  defaultSignerName,
}: {
  agreement: CIAgreementRecord;
  onSigned: () => void;
  onGoToPortal: () => void;
  defaultSignerName: string;
}) {
  const [signing, setSigning] = useState(false);
  const [padOpen, setPadOpen] = useState(false);

  const handleAdoptESignature = async (payload: CIESignaturePayload) => {
    setSigning(true);
    try {
      await signCIAgreementWithESignature(agreement.id, payload);
      setPadOpen(false);
      toast.success("Agreement signed successfully.");
      onSigned();
    } catch {
      toast.error("Could not save signature. Please try again.");
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
            Signed on {fmtDate(agreement.dateOfSigning)}
          </p>
        )}
        {agreement.validFrom && agreement.validUntil && (
          <p className="mt-1 text-xs text-muted-foreground">
            Valid: {fmtDate(agreement.validFrom)} — {fmtDate(agreement.validUntil)}
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
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-medium text-card-foreground">Waiting for Franchisee</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You have signed the agreement. Your franchisee needs to countersign before it becomes active.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <PenLine className="h-4 w-4" />
        </span>
        <h3 className="text-base font-medium text-card-foreground">Your signature</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Draw your signature with your mouse, finger, or stylus — or type your
        legal name and we&apos;ll render it in a signature script. You&apos;ll
        confirm before it&apos;s applied to the agreement.
      </p>
      <Button
        type="button"
        disabled={signing}
        onClick={() => setPadOpen(true)}
        className="w-full rounded-lg sm:w-auto"
      >
        {signing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <PenLine className="mr-2 h-4 w-4" />
        )}
        {signing ? "Saving…" : "Sign agreement"}
      </Button>
      <ESignaturePad
        open={padOpen}
        onOpenChange={setPadOpen}
        defaultName={defaultSignerName}
        onAdopt={handleAdoptESignature}
        submitting={signing}
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
        <CIAgreementDetail agreement={agreement} />
      </div>
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
            <CIAgreementStepper currentStep={currentStep} />
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
