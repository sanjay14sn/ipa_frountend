"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { ShipShipmentDto } from "@/services/fulfillment.service";
import {
  DialogFormField,
  FormDialog,
} from "@/components/shared/dialog";

/** Matches backend verify flow (`SHP-{orderId}-{base36 time}`). */
function suggestedTrackingNumber(orderId: number): string {
  return `SHP-${orderId}-${Date.now().toString(36).toUpperCase()}`;
}

type ShipDialogTrackingSeed = {
  orderId: number;
  tracking?: string | null;
  carrier?: string | null;
};

interface ShipShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: ShipShipmentDto) => Promise<void>;
  busy: boolean;
  shipmentTrackingSeed?: ShipDialogTrackingSeed | null;
}

export function ShipShipmentDialog({
  open,
  onOpenChange,
  onConfirm,
  busy,
  shipmentTrackingSeed = null,
}: ShipShipmentDialogProps) {
  const [shippedBy, setShippedBy] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const seedRef = useRef(shipmentTrackingSeed);
  seedRef.current = shipmentTrackingSeed;

  useEffect(() => {
    if (!open) return;
    const seed = seedRef.current;
    if (!seed) return;
    const existing = seed.tracking?.trim();
    setTrackingNumber(existing || suggestedTrackingNumber(seed.orderId));
    setCarrier(seed.carrier?.trim() ?? "");
    setShippedBy("");
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next && !busy) {
      setShippedBy("");
      setTrackingNumber("");
      setCarrier("");
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      size="sm"
      title="Mark as shipped"
      description="Confirm this shipment has been dispatched. Tracking is pre-filled from verification; change it if needed. Other fields are optional."
      onSubmit={handleSubmit}
      isSubmitting={busy}
      submitLabel={busy ? "Shipping…" : "Mark as shipped"}
    >
      <DialogFormField id="shippedBy" label="Shipped by">
        <Input
          id="shippedBy"
          placeholder="Name of person shipping"
          value={shippedBy}
          onChange={(e) => setShippedBy(e.target.value)}
          disabled={busy}
        />
      </DialogFormField>

      <DialogFormField id="trackingNumber" label="Tracking number">
        <Input
          id="trackingNumber"
          placeholder="e.g. 1Z999AA10123456784"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
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
    </FormDialog>
  );
}
