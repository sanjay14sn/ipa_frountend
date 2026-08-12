"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFormField, FormDialog } from "@/components/shared/dialog";
import { getAllFranchise } from "@/services/franchisee.service";
import { useAttachCIFranchise } from "@/hooks/api/ci-franchises.hooks";
import { getErrorMessage } from "@/lib/error-utils";

interface AttachFranchiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: { id: number; name: string; programId: number };
  /** Franchises already actively attached (handler included) — excluded from the picker. */
  attachedFranchiseIds: string[];
}

/**
 * Admin attaches an additional franchise to a multi-franchise CI. The attach
 * issues a new per-franchise CI agreement through the FULL sign flow (the CI
 * signs in their portal, the new franchisee countersigns, then it activates)
 * — the attachment is usable for certificates only once that agreement is
 * active. Franchise picker modeled on SetupExistingCIDialog step 1; targets
 * without an ACTIVE agreement for the CI's program are disabled (the backend
 * rejects them anyway — pre-filtering is UX, not enforcement).
 */
export function AttachFranchiseDialog({
  open,
  onOpenChange,
  instructor,
  attachedFranchiseIds,
}: AttachFranchiseDialogProps) {
  const [franchiseId, setFranchiseId] = useState("");
  const [tenure, setTenure] = useState("12");
  const [startDate, setStartDate] = useState("");
  const attachMutation = useAttachCIFranchise(instructor.id);
  const today = new Date().toISOString().slice(0, 10);

  const franchisesQuery = useQuery({
    queryKey: ["admin-franchises-for-ci-attach"],
    queryFn: () => getAllFranchise({ status: "Approved", page: 1, limit: 100 }),
    enabled: open,
  });

  const options = useMemo(() => {
    const attached = new Set(attachedFranchiseIds);
    return (franchisesQuery.data?.result ?? [])
      .filter((f) => !attached.has(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        hasProgramAgreement: (f.agreements ?? []).some(
          (a) =>
            (a.status ?? "").trim() === "ACTIVE" &&
            a.programId === instructor.programId,
        ),
      }));
  }, [franchisesQuery.data, attachedFranchiseIds, instructor.programId]);

  useEffect(() => {
    if (open) return;
    setFranchiseId("");
    setTenure("12");
    setStartDate("");
  }, [open]);

  const tenureNum = Number(tenure);
  const startDateValid = !startDate || startDate <= today;
  const canSubmit =
    !!franchiseId &&
    Number.isInteger(tenureNum) &&
    tenureNum >= 1 &&
    startDateValid;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await attachMutation.mutateAsync({
        franchiseId,
        tenure: tenureNum,
        ...(startDate ? { agreementStartDate: startDate } : {}),
      });
      toast.success(
        startDate
          ? "Franchise attached — the agreement is recorded as signed and active."
          : "Franchise attached — the new agreement is awaiting the CI's signature.",
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not attach the franchise."));
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Attach franchise"
      description={`Attach ${instructor.name} to another franchise.`}
      headerIcon={Building2}
      onSubmit={handleSubmit}
      isSubmitting={attachMutation.isPending}
      submitLabel="Attach franchise"
      canSubmit={canSubmit}
    >
      <div className="space-y-4 p-4 sm:p-5">
        <DialogFormField
          id="attach-franchise-select"
          label="Franchise"
          required
          hint={
            franchisesQuery.isLoading
              ? "Loading franchises…"
              : "Only approved franchises with an active agreement for this CI's program can be attached."
          }
        >
          <Select value={franchiseId} onValueChange={setFranchiseId}>
            <SelectTrigger id="attach-franchise-select">
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
                  {!f.hasProgramAgreement
                    ? " — no active agreement for this program"
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogFormField>

        <DialogFormField
          id="attach-tenure"
          label="Agreement tenure (months)"
          required
        >
          <Input
            id="attach-tenure"
            type="number"
            min={1}
            value={tenure}
            onChange={(e) => setTenure(e.target.value)}
          />
        </DialogFormField>

        <DialogFormField
          id="attach-start-date"
          label="Agreement start date"
          error={
            startDateValid ? undefined : "Start date cannot be in the future."
          }
          hint="Set this if the CI already works at this franchise and is being recorded late — the agreement is back-signed on this date and active immediately. Leave empty to send it for signing."
        >
          <DateInput value={startDate} onChange={setStartDate} />
        </DialogFormField>

        <div
          className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground"
          data-testid="attach-franchise-signflow-note"
        >
          {startDate
            ? "The agreement will be recorded as signed by both parties on the chosen date and becomes active immediately — no portal signing round-trip. Its expiry derives from that date plus the tenure."
            : "A new CI agreement will be issued for this franchise. The CI signs it in their portal, the franchisee countersigns, and it activates on the second signature."}{" "}
          Ordering and training-session rights stay with the handler franchise.
        </div>
      </div>
    </FormDialog>
  );
}
