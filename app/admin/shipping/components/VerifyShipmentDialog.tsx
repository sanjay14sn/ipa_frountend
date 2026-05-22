"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { VerifyShipmentDto } from "@/services/fulfillment.service";
import {
  DialogFormField,
  FormDialog,
} from "@/components/shared/dialog";

interface VerifyShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: VerifyShipmentDto) => Promise<void>;
  busy: boolean;
}

export function VerifyShipmentDialog({
  open,
  onOpenChange,
  onConfirm,
  busy,
}: VerifyShipmentDialogProps) {
  const [verifiedBy, setVerifiedBy] = useState("");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next && !busy) {
      setVerifiedBy("");
      setCarrier("");
      setNotes("");
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onConfirm({
      verifiedBy: verifiedBy.trim() || undefined,
      carrier: carrier.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setVerifiedBy("");
    setCarrier("");
    setNotes("");
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      size="sm"
      title="Verify shipment"
      description="Confirm this shipment is ready to dispatch. All fields are optional."
      onSubmit={handleSubmit}
      isSubmitting={busy}
      submitLabel={busy ? "Verifying…" : "Verify shipment"}
    >
      <DialogFormField id="verifiedBy" label="Verified by">
        <Input
          id="verifiedBy"
          placeholder="Name of person verifying"
          value={verifiedBy}
          onChange={(e) => setVerifiedBy(e.target.value)}
          disabled={busy}
        />
      </DialogFormField>

      <DialogFormField id="carrier" label="Carrier">
        <Input
          id="carrier"
          placeholder="e.g. BlueDart, DTDC"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          disabled={busy}
        />
      </DialogFormField>

      <DialogFormField id="notes" label="Notes">
        <Textarea
          id="notes"
          placeholder="Any additional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          rows={3}
        />
      </DialogFormField>
    </FormDialog>
  );
}
