"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VerifyShipmentDto } from "@/services/fulfillment.service";

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

  async function handleConfirm() {
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify shipment</DialogTitle>
          <DialogDescription>
            Confirm this shipment is ready to dispatch. All fields are optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="verifiedBy">Verified by</Label>
            <Input
              id="verifiedBy"
              placeholder="Name of person verifying"
              value={verifiedBy}
              onChange={(e) => setVerifiedBy(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="carrier">Carrier</Label>
            <Input
              id="carrier"
              placeholder="e.g. BlueDart, DTDC"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={busy}>
            {busy ? "Verifying…" : "Verify shipment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
