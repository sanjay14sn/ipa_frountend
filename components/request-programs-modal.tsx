"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import {
  requestProgram,
  getFranchiseList,
  RequestProgramDto,
} from "@/services/franchise.service";
import { listProgramRequests } from "@/services/program-request.service";
import type { ProgramRequestItem } from "@/services/program-request.service";
import { getEffectiveFranchiseStatus, type User } from "@/lib/auth";
import { getAllPrograms, Program } from "@/services/program.service";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { useUser } from "@/context/user-context";

interface RequestProgramsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Statuses that block re-requesting the same program on the same franchise.
 * Mixes ProgramRequest historical states with Agreement lifecycle states
 * (since both shapes flow through the same switcher feed):
 *
 *   - "Pending"   ProgramRequest awaiting admin
 *   - "Approved"  Agreement created but not yet Valid (signed + paid)
 *   - "Valid"     Agreement in force (post-refactor "active" state)
 *   - "Suspended" Agreement paused but still binding
 *
 * Terminal statuses ("Rejected", "Void", "Draft") allow a fresh request.
 */
const BLOCKED_STATUSES = new Set([
  "Pending",
  "Approved",
  "Valid",
  "Suspended",
]);

function isActiveFranchiseStatus(status: string | undefined): boolean {
  return (status ?? "").trim().toLowerCase() === "active";
}

function activeFranchiseChoices(
  user: User | null | undefined,
): Array<{ id: string; name: string; status: string }> {
  if (!user) return [];
  const fromList = (user.franchises ?? []).filter((f) =>
    isActiveFranchiseStatus(f.status),
  );
  if (fromList.length > 0) return fromList;
  const effective = getEffectiveFranchiseStatus(user, user.franchiseId);
  if (
    user.franchiseId &&
    user.franchiseName &&
    isActiveFranchiseStatus(effective)
  ) {
    return [
      {
        id: user.franchiseId,
        name: user.franchiseName,
        status: effective ?? "Active",
      },
    ];
  }
  return [];
}

export function RequestProgramsModal({
  open,
  onOpenChange,
}: RequestProgramsModalProps) {
  const { user } = useUser();

  const [franchiseId, setFranchiseId] = useState("");
  const [programId, setProgramId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [existingRequests, setExistingRequests] = useState<
    ProgramRequestItem[]
  >([]);
  const [franchiseOptions, setFranchiseOptions] = useState<
    Array<{ id: string; name: string; status: string }>
  >([]);

  useEffect(() => {
    if (!open) {
      setFranchiseOptions([]);
      return;
    }

    setLoadingData(true);
    Promise.all([getAllPrograms(), listProgramRequests(), getFranchiseList()])
      .then(([programData, requestData, franchiseList]) => {
        setPrograms(Array.isArray(programData) ? programData : []);
        setExistingRequests(Array.isArray(requestData) ? requestData : []);

        const rows = Array.isArray(franchiseList) ? franchiseList : [];
        const activeFromApi = rows
          .filter((f) => isActiveFranchiseStatus(f.status))
          .map((f) => ({ id: String(f.id), name: f.name, status: f.status }));
        setFranchiseOptions(
          activeFromApi.length > 0
            ? activeFromApi
            : activeFranchiseChoices(user),
        );
      })
      .catch(() => {
        setPrograms([]);
        setExistingRequests([]);
        setFranchiseOptions(activeFranchiseChoices(user));
      })
      .finally(() => setLoadingData(false));
  }, [open, user]);

  /** Program IDs already active/pending for the selected franchise — cannot be re-requested. */
  const blockedProgramIds = useMemo(() => {
    if (!franchiseId) return new Set<number>();
    return new Set(
      existingRequests
        .filter(
          (r) =>
            r.franchiseId === franchiseId && BLOCKED_STATUSES.has(r.status),
        )
        .map((r) => r.programId),
    );
  }, [existingRequests, franchiseId]);

  /** Programs the franchisee can still request for the selected franchise. */
  const availablePrograms = useMemo(
    () => programs.filter((p) => !blockedProgramIds.has(p.id)),
    [programs, blockedProgramIds],
  );

  // Reset program selection when franchise changes
  useEffect(() => {
    setProgramId("");
  }, [franchiseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!franchiseId) {
      toast.error("Select a franchise");
      return;
    }
    if (!programId) {
      toast.error("Select a program");
      return;
    }

    const dto: RequestProgramDto = {
      franchiseId,
      programIds: [Number(programId)],
    };

    setIsLoading(true);
    try {
      await requestProgram(dto);
      toast.success("Program request submitted successfully");
      setSubmitted(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to submit program request"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      setFranchiseId("");
      setProgramId("");
      setSubmitted(false);
    }
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="mx-4 w-full max-w-md rounded-2xl border-border">
          <DialogHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-surface-green p-3">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-semibold text-card-foreground">
              Request Submitted!
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Your program request has been submitted. Admin will review and
              approve it shortly.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleClose} className="w-full rounded-lg">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (loadingData) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="mx-4 w-full max-w-md rounded-2xl border-border">
          <DialogTitle className="sr-only">Loading</DialogTitle>
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg overflow-hidden rounded-2xl border-border p-0">
        <DialogHeader className="border-b border-border bg-surface-green/40 px-6 pb-4 pt-6">
          <DialogTitle className="text-lg font-semibold text-card-foreground">
            Request a Program
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Request one new program for an existing franchise. Admin will review
            and approve it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Franchise select */}
          <div className="space-y-2">
            <Label htmlFor="franchise">Franchise *</Label>
            <Select
              value={franchiseId}
              onValueChange={setFranchiseId}
              disabled={franchiseOptions.length === 0}
            >
              <SelectTrigger className="rounded-lg border-border">
                <SelectValue placeholder="Select franchise" />
              </SelectTrigger>
              <SelectContent>
                {franchiseOptions.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {franchiseOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active franchises found. If you just became active, refresh
                the page or sign in again.
              </p>
            )}
          </div>

          {/* Program select */}
          <div className="space-y-2">
            <Label htmlFor="program">Program *</Label>
            {!franchiseId ? (
              <p className="text-sm text-muted-foreground">
                Select a franchise first.
              </p>
            ) : availablePrograms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All programs have already been requested or are active for this
                franchise.
              </p>
            ) : (
              <Select
                value={programId}
                onValueChange={setProgramId}
              >
                <SelectTrigger className="rounded-lg border-border">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {availablePrograms.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {franchiseId && blockedProgramIds.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {blockedProgramIds.size} program
                {blockedProgramIds.size === 1 ? "" : "s"} already
                requested or active for this franchise.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-border"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-lg"
              disabled={
                isLoading ||
                !franchiseId ||
                !programId ||
                availablePrograms.length === 0
              }
            >
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
