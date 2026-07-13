"use client";

import { useState, useEffect, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  AppDialog,
  DialogFormField,
  FormDialog,
  SuccessDialog,
} from "@/components/shared/dialog";

interface RequestProgramsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Request statuses that block re-requesting the same program on the same
 * franchise. The feed (`listProgramRequests`) only ever carries request
 * statuses — "Pending" | "Approved" | "Rejected" — never agreement lifecycle
 * values, so "Rejected" is the only terminal value here.
 *
 *   - "Pending"   awaiting admin decision
 *   - "Approved"  an agreement was spawned for the request — BUT if that
 *     agreement has since been voided or expired (`row.agreementStatus`),
 *     the program is re-requestable again and is excluded from the blocked
 *     set below (backend defers to the live agreement the same way).
 */
const BLOCKED_STATUSES = new Set(["Pending", "Approved"]);

/** Agreement lifecycle states (UPPER_SNAKE) that un-block an Approved request's program. */
const REREQUESTABLE_AGREEMENT_STATUSES = new Set(["VOID", "EXPIRED"]);

function isActiveFranchiseStatus(status: string | undefined): boolean {
  // Operational franchises now carry the "Approved" review status; operational
  // standing itself is derived from agreements.
  return (status ?? "").trim().toLowerCase() === "approved";
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
        status: effective ?? "Approved",
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
  const [loadError, setLoadError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [existingRequests, setExistingRequests] = useState<
    ProgramRequestItem[]
  >([]);
  const [franchiseOptions, setFranchiseOptions] = useState<
    Array<{ id: string; name: string; status: string }>
  >([]);

  const loadModalData = () => {
    setLoadingData(true);
    setLoadError(false);
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
        setLoadError(true);
        setFranchiseOptions(activeFranchiseChoices(user));
      })
      .finally(() => setLoadingData(false));
  };

  useEffect(() => {
    if (!open) {
      setFranchiseOptions([]);
      return;
    }
    loadModalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const blockedProgramIds = useMemo(() => {
    if (!franchiseId) return new Set<number>();
    return new Set(
      existingRequests
        .filter(
          (r) =>
            r.franchiseId === franchiseId &&
            BLOCKED_STATUSES.has(r.status) &&
            !(
              r.agreementStatus &&
              REREQUESTABLE_AGREEMENT_STATUSES.has(r.agreementStatus)
            ),
        )
        .map((r) => r.programId),
    );
  }, [existingRequests, franchiseId]);

  const availablePrograms = useMemo(
    () => programs.filter((p) => !blockedProgramIds.has(p.id)),
    [programs, blockedProgramIds],
  );

  useEffect(() => {
    setProgramId("");
  }, [franchiseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadError) {
      toast.error("Couldn't load programs — retry above");
      return;
    }
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
      <SuccessDialog
        open={open}
        onOpenChange={handleClose}
        title="Request Submitted!"
        description="Your program request has been submitted. Admin will review and approve it shortly."
        actionLabel="Close"
        onAction={handleClose}
      />
    );
  }

  if (loadingData) {
    return (
      <AppDialog open={open} onOpenChange={handleClose} size="sm">
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="sr-only">Loading</span>
        </div>
      </AppDialog>
    );
  }

  const canSubmit =
    Boolean(franchiseId) &&
    Boolean(programId) &&
    availablePrograms.length > 0;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleClose}
      size="md"
      title="Request a Program"
      description="Request one new program for an existing franchise. Admin will review and approve it."
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      canSubmit={canSubmit}
      submitLabel="Submit Request"
    >
      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>Couldn&apos;t load programs.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadModalData}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <DialogFormField
        id="franchise"
        label="Franchise"
        required
        hint={
          franchiseOptions.length === 0
            ? "No active franchises found. If you just became active, refresh the page or sign in again."
            : undefined
        }
      >
        <Select
          value={franchiseId}
          onValueChange={setFranchiseId}
          disabled={franchiseOptions.length === 0}
        >
          <SelectTrigger id="franchise" className="rounded-lg">
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
      </DialogFormField>

      <DialogFormField
        id="program"
        label="Program"
        required
        hint={
          franchiseId && blockedProgramIds.size > 0
            ? `${blockedProgramIds.size} program${
                blockedProgramIds.size === 1 ? "" : "s"
              } already requested or active for this franchise.`
            : undefined
        }
      >
        {!franchiseId ? (
          <p className="text-sm text-muted-foreground">
            Select a franchise first.
          </p>
        ) : loadError ? (
          <p className="text-sm text-destructive">
            Programs could not be loaded — use Retry above.
          </p>
        ) : availablePrograms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All programs have already been requested or are active for this
            franchise.
          </p>
        ) : (
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger id="program" className="rounded-lg">
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
      </DialogFormField>
    </FormDialog>
  );
}
