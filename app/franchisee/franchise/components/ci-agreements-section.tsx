"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date-utils";
import dynamic from "next/dynamic";
import { Eye, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  type DataTableColumn,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  TableLoadingState,
  TablePageShell,
} from "@/components/shared";
import { getErrorMessage } from "@/lib/error-utils";
import {
  type CIAgreementData,
  listCIAgreementsForFranchisee,
  signCIAgreementAsFranchisee,
  signCIAgreementAsFranchiseeFile,
  getCIAgreementByIdForFranchisee,
} from "@/services/contracting.service";
import { franchiseeProfileSignatureSrc } from "@/services/agreement.service";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import { useUser } from "@/context/user-context";
import type { ESignatureResult } from "@/components/esignature/ESignaturePad";
import { cleanAgreementTitle } from "@/components/agreements/agreement-utils";
import { AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, DetailDialog } from "@/components/shared/dialog";
import { SignatureCapturePanel } from "@/components/esignature/SignatureCapturePanel";


// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtShort(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return formatDate(iso);
  } catch {
    return iso ?? "—";
  }
}

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

// ─── Sign dialog ──────────────────────────────────────────────────────────────

function SignDialog({
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
    <>
      <AppDialog
        open={!!agreement}
        onOpenChange={handleOpenChange}
        size="md"
      >
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

    </>
  );
}

// ─── View dialog ─────────────────────────────────────────────────────────────

function ViewDialog({
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

// ─── Section ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 10;

export function CIAgreementsSection() {
  const { user } = useUser();
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the active franchise changes
  useEffect(() => {
    setPage(1);
  }, [user?.franchiseId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["franchisee-ci-agreements", user?.franchiseId, page],
    queryFn: () => listCIAgreementsForFranchisee({ page, limit: PAGE_LIMIT }),
    enabled: !!user,
  });

  useEffect(() => {
    if (error) toast.error(getErrorMessage(error, "Failed to load CI agreements"));
  }, [error]);

  const [signingAgreement, setSigningAgreement] = useState<CIAgreementData | null>(null);
  const [viewingAgreementId, setViewingAgreementId] = useState<number | null>(null);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const columns: DataTableColumn<CIAgreementData>[] = [
    {
      key: "agreement",
      header: "Agreement",
    },
    {
      key: "phase",
      header: "Status",
      className: "text-center",
      render: (r) => <PhaseBadge phase={r.phase} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[160px] text-center",
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
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
      ),
    },
  ];

  return (
    <TablePageShell
      title="CI agreements"
      description="Agreements with your course instructors. Sign any that are awaiting your signature to activate them."
    >
      {isLoading && rows.length === 0 ? (
        <TableLoadingState message="Loading CI agreements…" />
      ) : (
        <DataTable<CIAgreementData>
          data={rows}
          loading={isLoading}
          columns={columns}
          getRowId={(r) => String(r.id)}
          pagination={{ total, totalPages }}
          currentPage={page}
          onPageChange={setPage}
          renderMainCell={(r) => (
            <span className="font-medium">
              {r.instructorName ?? `Instructor #${r.instructorId}`}
              <span className="mx-1 text-muted-foreground">-</span>
              {r.franchiseName ?? r.franchiseId}
            </span>
          )}
          renderExpandedContent={(r) => (
            <ExpandedDetailSurface>
              <ExpandedDetailSection title="Agreement details">
                <DetailFieldsGrid columns={3}>
                  <DetailField label="ID" value={String(r.id)} />
                  <DetailField
                    label="Instructor"
                    value={r.instructorName ?? `Instructor #${r.instructorId}`}
                  />
                  <DetailField
                    label="Status"
                    value={PHASE_CONFIG[r.phase]?.label ?? r.phase}
                  />
                  <DetailField label="Tenure" value={r.tenure != null ? `${r.tenure} months` : "—"} />
                  <DetailField label="Expires" value={fmtShort(r.expiresAt)} />
                </DetailFieldsGrid>
              </ExpandedDetailSection>
            </ExpandedDetailSurface>
          )}
          emptyMessage="No CI agreements on file yet."
          resultsText={(_c, total) =>
            `${total} CI agreement${total === 1 ? "" : "s"}`
          }
        />
      )}

      <SignDialog
        agreement={signingAgreement}
        onSigned={() => {
          setSigningAgreement(null);
          void refetch();
        }}
        onClose={() => setSigningAgreement(null)}
      />

      <ViewDialog
        agreementId={viewingAgreementId}
        onClose={() => setViewingAgreementId(null)}
      />
    </TablePageShell>
  );
}
