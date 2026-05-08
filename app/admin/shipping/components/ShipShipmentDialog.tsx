"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ShipShipmentDto } from "@/services/fulfillment.service";

interface ShipShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: ShipShipmentDto) => Promise<void>;
  busy: boolean;
}

export function ShipShipmentDialog({
  open,
  onOpenChange,
  onConfirm,
  busy,
}: ShipShipmentDialogProps) {
  const [shippedBy, setShippedBy] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next && !busy) {
      setShippedBy("");
      setTrackingNumber("");
      setCarrier("");
    }
    onOpenChange(next);
  }

  async function handleConfirm() {
    await onConfirm({
      shippedBy: shippedBy.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      carrier: carrier.trim() || undefined,
    });
    setShippedBy("");
    setTrackingNumber("");
    setCarrier("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as shipped</DialogTitle>
          <DialogDescription>
            Confirm this shipment has been dispatched. Both fields are optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="shippedBy">Shipped by</Label>
            <Input
              id="shippedBy"
              placeholder="Name of person shipping"
              value={shippedBy}
              onChange={(e) => setShippedBy(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trackingNumber">Tracking number</Label>
            <Input
              id="trackingNumber"
              placeholder="e.g. 1Z999AA10123456784"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
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
            {busy ? "Shipping…" : "Mark as shipped"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
