"use client";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date-utils";
import {
  AppDialog,
  AppDialogHeader,
  AppDialogBody,
} from "@/components/shared/dialog";
import { toast } from "sonner";
import {
  useWaitingForSession,
  useSessionAssignments,
  bulkAssignToSessionWithRevalidation,
} from "@/hooks/api/course-instructor.hooks";
import type { FranchiseeTrainingSession } from "@/services/ci-training-franchisee.service";
import { WaitingCICheckboxAssignPanel } from "@/components/ci-training/WaitingCICheckboxAssignPanel";

interface BulkAssignCIModalProps {
  session: FranchiseeTrainingSession | null;
  onClose: () => void;
}

export default function BulkAssignCIModal({ session, onClose }: BulkAssignCIModalProps) {
  const sessionId = session?.id ?? null;
  const { waiting, isLoading: isLoadingWaiting } = useWaitingForSession(sessionId);
  const { assigned, isLoading: isLoadingAssigned } = useSessionAssignments(sessionId);

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <AppDialog open={session != null} onOpenChange={handleOpenChange} size="md" scrollBody>
      <AppDialogHeader
        title="Assign CIs to Session"
        description={
          session
            ? `${formatDate(session.sessionDate)} — ${session.trainingLevelName ?? `Level ${session.trainingLevelId}`} — ${session.region}`
            : ""
        }
      />
      <AppDialogBody layout="fill">
        {session ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="shrink-0 rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">Assigned CIs</div>
              {isLoadingAssigned ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : assigned.length === 0 ? (
                <p className="text-sm text-muted-foreground">No CIs assigned to this session yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {assigned.map((ci) => (
                    <Badge
                      key={ci.assignmentId}
                      variant="secondary"
                      className="h-7 max-w-full gap-1 py-0 pl-1.5 pr-1.5 font-normal"
                    >
                      <span className="max-w-[220px] truncate">
                        {ci.instructorName ?? "Unknown Instructor"}
                      </span>
                      {ci.status === "COMPLETED" ? (
                        <span className="text-[10px] text-muted-foreground">(done)</span>
                      ) : null}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <WaitingCICheckboxAssignPanel
              key={session.id}
              className="min-h-0 flex-1"
              waitingCIs={waiting}
              isWaitingLoading={isLoadingWaiting}
              onSave={async (assignmentIds) => {
                const result = await bulkAssignToSessionWithRevalidation(
                  session.id,
                  assignmentIds,
                );
                toast.success(`${result.assigned} assigned, ${result.skipped} skipped.`);
              }}
            />
          </div>
        ) : null}
      </AppDialogBody>
    </AppDialog>
  );
}
