"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { useUser } from "@/context/user-context";
import { getErrorMessage } from "@/lib/error-utils";

/** Live per the backend's LIVE_STATUSES — a row the sign/view buttons should target. */
const LIVE_AGREEMENT_STATUSES = new Set(["APPROVED", "ACTIVE", "SUSPENDED"]);

/**
 * Deterministic current-agreement pick per instructor: prefer live rows
 * (APPROVED/ACTIVE/SUSPENDED) over dead ones (VOID/SUPERSEDED/EXPIRED), then
 * the newest (highest id). Replaces a last-write-wins Map.set that silently
 * targeted whichever row the server happened to order last once an
 * instructor had history rows (VOID + reissued APPROVED, SUPERSEDED chain).
 */
export function pickCurrentAgreementPerInstructor(
  rows: CIAgreementData[],
): Map<number, CIAgreementData> {
  const byInstructor = new Map<number, CIAgreementData>();
  for (const row of rows) {
    if (row.instructorId == null) continue;
    const current = byInstructor.get(row.instructorId);
    if (!current) {
      byInstructor.set(row.instructorId, row);
      continue;
    }
    const rowLive = LIVE_AGREEMENT_STATUSES.has(String(row.status));
    const currentLive = LIVE_AGREEMENT_STATUSES.has(String(current.status));
    if (rowLive !== currentLive) {
      if (rowLive) byInstructor.set(row.instructorId, row);
      continue;
    }
    if (row.id > current.id) byInstructor.set(row.instructorId, row);
  }
  return byInstructor;
}

/**
 * Map of course-instructor id → their current CI agreement for the ACTIVE
 * franchise (server-side scoped via `franchiseId`, so a multi-franchise
 * owner never sees another centre's agreements here).
 */
export function useCIAgreementsByInstructor() {
  const { user } = useUser();
  const franchiseId = user?.franchiseId;
  const query = useQuery({
    queryKey: ["franchisee-ci-agreements", franchiseId, "by-instructor"],
    queryFn: () =>
      listCIAgreementsForFranchisee({ page: 1, limit: 100, franchiseId }),
    enabled: !!franchiseId,
  });

  const byInstructor = pickCurrentAgreementPerInstructor(
    query.data?.rows ?? [],
  );
  return { byInstructor, refetch: query.refetch };
}

/** Moved verbatim from the dashboard rail (originally the franchise page). */
export function CISignDialog({
  agreement,
  onSigned,
  onClose,
}: {
  agreement: CIAgreementData | null;
  onSigned: () => void;
  onClose: () => void;
}) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const profileSignatureSrc = franchiseeProfileSignatureSrc(
    user?.profile?.franchiseeSignature,
  );

  // Countersigning can activate the agreement — refresh the CI list so the
  // row's operationalStatus chip flips without a manual reload.
  const invalidateCiList = () => {
    void queryClient.invalidateQueries({
      queryKey: ["course-instructors", "list"],
    });
  };

  const handleSignWithExisting = async () => {
    if (!agreement) return;
    setSubmitting(true);
    try {
      await signCIAgreementAsFranchisee(agreement.id);
      toast.success("CI agreement signed successfully.");
      invalidateCiList();
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
      invalidateCiList();
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

/** Moved verbatim from the dashboard rail (originally the franchise page). */
export function CIViewDialog({
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
