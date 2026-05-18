"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CIAgreementData,
  listCIAgreementsForFranchisee,
  signCIAgreementAsFranchisee,
} from "@/services/contracting.service";
import { FileSignature } from "lucide-react";

interface SignCIAgreementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function phaseLabel(phase: CIAgreementData["phase"]): string {
  switch (phase) {
    case "PENDING_CI_SIGNATURE": return "Awaiting CI signature";
    case "PENDING_FRANCHISEE_SIGNATURE": return "Awaiting your signature";
    case "SIGNED": return "Signed";
    case "EXPIRED": return "Expired";
  }
}

function phaseBadgeVariant(phase: CIAgreementData["phase"]): "default" | "secondary" | "destructive" | "outline" {
  if (phase === "SIGNED") return "default";
  if (phase === "EXPIRED") return "destructive";
  if (phase === "PENDING_FRANCHISEE_SIGNATURE") return "outline";
  return "secondary";
}

export default function SignCIAgreementModal({ open, onOpenChange }: SignCIAgreementModalProps) {
  const [signingId, setSigningId] = useState<number | null>(null);
  const [signaturePath, setSignaturePath] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["franchisee-ci-agreements"],
    queryFn: () => listCIAgreementsForFranchisee({ limit: 50 }),
    enabled: open,
  });

  const agreements = data?.rows ?? [];
  const pendingMySignature = agreements.filter((a) => a.phase === "PENDING_FRANCHISEE_SIGNATURE");

  const handleSign = async () => {
    if (!signingId || !signaturePath.trim()) return;
    setSubmitting(true);
    try {
      await signCIAgreementAsFranchisee(signingId, signaturePath.trim());
      toast.success("Agreement signed");
      setSigningId(null);
      setSignaturePath("");
      void refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to sign.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            CI Agreements
          </DialogTitle>
          <DialogDescription>
            Review and sign pending course instructor agreements
          </DialogDescription>
        </DialogHeader>

        {agreements.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No CI agreements found</p>
        )}

        <div className="space-y-3">
          {agreements.map((ag) => (
            <div key={ag.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{ag.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ag.validFrom && ag.validUntil
                      ? `${ag.validFrom} – ${ag.validUntil}`
                      : `Agreement #${ag.id}`}
                  </p>
                </div>
                <Badge variant={phaseBadgeVariant(ag.phase)}>{phaseLabel(ag.phase)}</Badge>
              </div>

              {ag.phase === "PENDING_FRANCHISEE_SIGNATURE" && signingId !== ag.id && (
                <Button size="sm" variant="outline" onClick={() => setSigningId(ag.id)}>
                  Sign Agreement
                </Button>
              )}

              {signingId === ag.id && (
                <div className="space-y-2 pt-1 border-t">
                  <div className="space-y-1">
                    <Label htmlFor={`sig-${ag.id}`} className="text-xs">
                      Signature reference / path
                    </Label>
                    <Input
                      id={`sig-${ag.id}`}
                      placeholder="e.g. signatures/franchisee-signed.png"
                      value={signaturePath}
                      onChange={(e) => setSignaturePath(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSign} disabled={submitting || !signaturePath.trim()}>
                      {submitting ? "Signing..." : "Confirm Signature"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSigningId(null); setSignaturePath(""); }} disabled={submitting}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
