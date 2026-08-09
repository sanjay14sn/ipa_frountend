"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const byInstructor = new Map<number, CIAgreementData>();
  for (const row of query.data?.rows ?? []) {
    if (row.instructorId != null) byInstructor.set(row.instructorId, row);
  }
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
