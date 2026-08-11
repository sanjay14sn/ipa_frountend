"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ConfirmDialog,
  DialogFormField,
  DialogStateMessage,
  FormDialog,
} from "@/components/shared/dialog";
import { getAllFranchise } from "@/services/franchisee.service";
import { useTransferCIHandler } from "@/hooks/api/ci-franchises.hooks";
import { getErrorMessage } from "@/lib/error-utils";

interface TransferHandlerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: { id: number; name: string; programId: number };
  handlerFranchiseId: string;
  handlerFranchiseName?: string | null;
  /** Actively attached franchise ids (handler included) — used to annotate targets. */
  attachedFranchiseIds: string[];
}

/**
 * Admin moves the handler (owner) role to another franchise. Irreversible in
 * effect: the current handler is FULLY detached (their agreement voided) and
 * unpaid training fees carry over to the new handler's agreement, so the
 * submit goes through a nested destructive ConfirmDialog.
 */
export function TransferHandlerDialog({
  open,
  onOpenChange,
  instructor,
  handlerFranchiseId,
  handlerFranchiseName,
  attachedFranchiseIds,
}: TransferHandlerDialogProps) {
  const [franchiseId, setFranchiseId] = useState("");
  const [tenure, setTenure] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const transferMutation = useTransferCIHandler(instructor.id);

  const franchisesQuery = useQuery({
    queryKey: ["admin-franchises-for-ci-transfer"],
    queryFn: () => getAllFranchise({ status: "Approved", page: 1, limit: 100 }),
    enabled: open,
  });

  const attachedSet = useMemo(
    () => new Set(attachedFranchiseIds),
    [attachedFranchiseIds],
  );

  const options = useMemo(
    () =>
      (franchisesQuery.data?.result ?? [])
        .filter((f) => f.id !== handlerFranchiseId)
        .map((f) => ({
          id: f.id,
          name: f.name,
          isAttached: attachedSet.has(f.id),
          hasProgramAgreement: (f.agreements ?? []).some(
            (a) =>
              (a.status ?? "").trim() === "ACTIVE" &&
              a.programId === instructor.programId,
          ),
        })),
    [franchisesQuery.data, handlerFranchiseId, attachedSet, instructor.programId],
  );

  const selected = options.find((f) => f.id === franchiseId);

  useEffect(() => {
    if (open) return;
    setFranchiseId("");
    setTenure("");
    setConfirmOpen(false);
  }, [open]);

  const tenureNum = tenure.trim() === "" ? undefined : Number(tenure);
  const tenureValid =
    tenureNum === undefined || (Number.isInteger(tenureNum) && tenureNum >= 1);
  const canSubmit = !!franchiseId && tenureValid;

  const handleConfirm = async () => {
    try {
      await transferMutation.mutateAsync({
        franchiseId,
        ...(tenureNum !== undefined ? { tenure: tenureNum } : {}),
      });
      toast.success(
        `Ownership transferred to ${selected?.name ?? "the new franchise"}.`,
      );
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (err) {
      setConfirmOpen(false);
      toast.error(getErrorMessage(err, "Could not transfer ownership."));
    }
  };

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        size="md"
        title="Transfer handler"
        description={`Move ownership of ${instructor.name} to another franchise.`}
        headerIcon={ArrowLeftRight}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) setConfirmOpen(true);
        }}
        isSubmitting={transferMutation.isPending}
        submitLabel="Transfer ownership"
        canSubmit={canSubmit}
      >
        <div className="space-y-4 p-4 sm:p-5">
          <DialogFormField
            id="transfer-franchise-select"
            label="New handler franchise"
            required
            hint={
              franchisesQuery.isLoading
                ? "Loading franchises…"
                : "Targets not yet attached are attached automatically as part of the transfer."
            }
          >
            <Select value={franchiseId} onValueChange={setFranchiseId}>
              <SelectTrigger id="transfer-franchise-select">
                <SelectValue placeholder="Select a franchise" />
              </SelectTrigger>
              <SelectContent>
                {options.map((f) => (
                  <SelectItem
                    key={f.id}
                    value={f.id}
                    disabled={!f.hasProgramAgreement}
                  >
                    {f.name}
                    {f.isAttached
                      ? " — already attached"
                      : !f.hasProgramAgreement
                        ? " — no active agreement for this program"
                        : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogFormField>

          <DialogFormField
            id="transfer-tenure"
            label="New agreement tenure (months)"
            hint="Optional — defaults to the current handler agreement's tenure. Only used when the target needs a fresh agreement."
          >
            <Input
              id="transfer-tenure"
              type="number"
              min={1}
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              placeholder="Inherit from current agreement"
            />
          </DialogFormField>

          <DialogStateMessage
            tone="warning"
            title="What a transfer does"
            className="text-xs"
            description={
              <ul className="list-disc space-y-0.5 pl-4" data-testid="transfer-consequences-note">
                <li>
                  {handlerFranchiseName ?? "The current handler"} is fully
                  detached and their CI agreement is voided.
                </li>
                <li>
                  Unpaid training fees carry over to the new handler&apos;s
                  agreement; settled fees and completed levels are untouched.
                </li>
                <li>
                  Until the new agreement is fully signed, the CI cannot be
                  used by the new handler (mirrors fresh onboarding).
                </li>
              </ul>
            }
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        variant="destructive"
        title="Transfer ownership?"
        description={`${handlerFranchiseName ?? "The current handler"} will be detached and their agreement voided. ${selected?.name ?? "The selected franchise"} becomes ${instructor.name}'s handler.`}
        confirmLabel="Transfer"
        onConfirm={handleConfirm}
        isConfirming={transferMutation.isPending}
      />
    </>
  );
}
