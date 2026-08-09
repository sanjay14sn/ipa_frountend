"use client";

import { useEffect, useState } from "react";
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
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import { cleanAgreementTitle } from "@/components/agreements/agreement-utils";
import { SignatureCapturePanel } from "@/components/esignature/SignatureCapturePanel";
import type { ESignatureResult } from "@/components/esignature/ESignaturePad";
import { franchiseeProfileSignatureSrc } from "@/services/agreement.service";
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
import { queryKeys } from "@/hooks/api/query-keys";
import { useUser } from "@/context/user-context";
import { formatDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/error-utils";

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
 * Programs + CI agreements from the retired /franchisee/franchise page as
 * dashboard rail cards. The franchise agreement itself lives in the
 * AgreementHero band under the header. Stacks in the right column at xl;
 * flows as a card row below that.
 */
export function FranchiseRail({ onRequestProgram }: FranchiseRailProps) {
  return (
    <div
      data-testid="franchise-rail"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1"
    >
      <ProgramsRailCard onRequestProgram={onRequestProgram} />
      <CIAgreementsRailCard />
    </div>
  );
}
