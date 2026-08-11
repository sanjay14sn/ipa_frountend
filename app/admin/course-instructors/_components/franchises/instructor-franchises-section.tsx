"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Building2, Eye, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpandedDetailSection } from "@/components/shared";
import { ConfirmDialog } from "@/components/shared/dialog";
import { AdminCIAgreementSheet } from "@/components/agreements/AdminCIAgreementSheet";
import type {
  AdminCourseInstructorData,
  CIFranchiseAttachment,
} from "@/services/course-instructor.service";
import {
  useCIFranchises,
  useDetachCIFranchise,
} from "@/hooks/api/ci-franchises.hooks";
import { getErrorMessage } from "@/lib/error-utils";
import { AttachFranchiseDialog } from "./attach-franchise-dialog";
import { TransferHandlerDialog } from "./transfer-handler-dialog";

const PHASE_LABELS: Record<string, string> = {
  PENDING_CI_SIGNATURE: "Awaiting CI signature",
  PENDING_FRANCHISEE_SIGNATURE: "Awaiting franchisee",
  SIGNED: "Signed",
  EXPIRED: "Expired",
};

function agreementChip(agreement: CIFranchiseAttachment["agreement"]) {
  if (!agreement) return <Badge variant="outline">No agreement</Badge>;
  if (agreement.status === "VOID") return <Badge variant="outline">Void</Badge>;
  const label =
    (agreement.phase && PHASE_LABELS[agreement.phase]) ??
    agreement.status ??
    "—";
  return agreement.phase === "SIGNED" ? (
    <Badge variant="secondary">{label}</Badge>
  ) : (
    <Badge variant="outline">{label}</Badge>
  );
}

interface InstructorFranchisesSectionProps {
  instructor: AdminCourseInstructorData;
  /** Attach/transfer/detach affordances — hidden for Pending/Rejected CIs. */
  showActions?: boolean;
}

/**
 * Multi-franchise panel in the admin CI detail: every franchise attachment
 * (handler first) with its agreement phase, plus the attach / transfer /
 * detach operations. Per-expand fetch, matching InstructorReceivablesSection.
 */
export function InstructorFranchisesSection({
  instructor,
  showActions = false,
}: InstructorFranchisesSectionProps) {
  const { data: franchises, isLoading } = useCIFranchises(instructor.id);
  const detachMutation = useDetachCIFranchise(instructor.id);
  const [attachOpen, setAttachOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [detachTarget, setDetachTarget] =
    useState<CIFranchiseAttachment | null>(null);
  const [viewAgreementId, setViewAgreementId] = useState<number | null>(null);

  const rows = franchises ?? [];
  const attachedIds = rows.map((f) => f.franchiseId);
  const handlerRow = rows.find((f) => f.isHandler);

  const handleDetach = async () => {
    if (!detachTarget) return;
    try {
      await detachMutation.mutateAsync(detachTarget.franchiseId);
      toast.success(
        `${detachTarget.franchiseName ?? "Franchise"} detached${
          detachTarget.agreement ? " — their agreement was voided" : ""
        }.`,
      );
      setDetachTarget(null);
    } catch (err) {
      setDetachTarget(null);
      toast.error(getErrorMessage(err, "Could not detach the franchise."));
    }
  };

  return (
    <>
      <ExpandedDetailSection
        title="Franchises"
        actions={
          showActions ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2.5 text-xs"
                onClick={() => setAttachOpen(true)}
                data-testid="attach-franchise-button"
              >
                <Building2 className="h-3 w-3" />
                Attach franchise
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2.5 text-xs"
                onClick={() => setTransferOpen(true)}
                data-testid="transfer-handler-button"
              >
                <ArrowLeftRight className="h-3 w-3" />
                Transfer handler
              </Button>
            </div>
          ) : undefined
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No franchise attachments.
          </p>
        ) : (
          <div>
            {rows.map((f) => (
              <div
                key={f.franchiseId}
                className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {f.franchiseName ?? "—"}
                    {f.franchiseCode ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {f.franchiseCode}
                      </span>
                    ) : null}
                  </p>
                </div>
                {f.isHandler ? <Badge>Handler</Badge> : null}
                {agreementChip(f.agreement)}
                {f.agreement ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 gap-1 px-2 text-xs"
                    onClick={() => setViewAgreementId(f.agreement!.id)}
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                ) : null}
                {showActions && !f.isHandler ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 gap-1 border-destructive/30 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => setDetachTarget(f)}
                  >
                    <Unlink className="h-3 w-3" />
                    Detach
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ExpandedDetailSection>

      {showActions ? (
        <>
          <AttachFranchiseDialog
            open={attachOpen}
            onOpenChange={setAttachOpen}
            instructor={{
              id: instructor.id,
              name: instructor.name,
              programId: instructor.programId,
            }}
            attachedFranchiseIds={attachedIds}
          />
          <TransferHandlerDialog
            open={transferOpen}
            onOpenChange={setTransferOpen}
            instructor={{
              id: instructor.id,
              name: instructor.name,
              programId: instructor.programId,
            }}
            handlerFranchiseId={instructor.franchiseId}
            handlerFranchiseName={
              handlerRow?.franchiseName ?? instructor.franchise?.name
            }
            attachedFranchiseIds={attachedIds}
          />
          <ConfirmDialog
            open={detachTarget != null}
            onOpenChange={(open) => {
              if (!open) setDetachTarget(null);
            }}
            variant="destructive"
            title={`Detach ${detachTarget?.franchiseName ?? "franchise"}?`}
            description="This voids their CI agreement; they lose visibility of the CI and can no longer use them for student certificates."
            confirmLabel="Detach"
            onConfirm={handleDetach}
            isConfirming={detachMutation.isPending}
          />
        </>
      ) : null}

      <AdminCIAgreementSheet
        agreementId={viewAgreementId}
        onClose={() => setViewAgreementId(null)}
      />
    </>
  );
}
