"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const sessionId = session?.id ?? null;
  const { waiting, isLoading: isLoadingWaiting } = useWaitingForSession(sessionId);
  const { assigned, isLoading: isLoadingAssigned } = useSessionAssignments(sessionId);

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Dialog open={session != null} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-2 overflow-hidden sm:max-w-[560px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Assign CIs to Session</DialogTitle>
          <DialogDescription>
            {session
              ? `${new Date(session.sessionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} — ${session.trainingLevelName ?? `Level ${session.trainingLevelId}`} — ${session.region}`
              : ""}
          </DialogDescription>
        </DialogHeader>

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
                toast({
                  title: "CIs assigned",
                  description: `${result.assigned} assigned, ${result.skipped} skipped.`,
                });
              }}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
