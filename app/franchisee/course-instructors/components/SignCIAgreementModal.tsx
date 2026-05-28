"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CIAgreementData,
  listCIAgreementsForFranchisee,
  signCIAgreementAsFranchisee,
} from "@/services/contracting.service";
import { FileSignature } from "lucide-react";
import { DetailDialog } from "@/components/shared/dialog";

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
  const [submitting, setSubmitting] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["franchisee-ci-agreements"],
    queryFn: () => listCIAgreementsForFranchisee({ limit: 50 }),
    enabled: open,
  });

  const agreements = data?.rows ?? [];

  const handleSign = async () => {
    if (!signingId) return;
    setSubmitting(true);
    try {
      await signCIAgreementAsFranchisee(signingId);
      toast.success("Agreement signed");
      setSigningId(null);
      void refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to sign.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="CI Agreements"
      description="Review and sign pending course instructor agreements"
      headerIcon={FileSignature}
      footer={{
        secondary: { label: "Close", onClick: () => onOpenChange(false) },
      }}
    >
      {agreements.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No CI agreements found
        </p>
      ) : (
        <div className="space-y-3">
          {agreements.map((ag) => (
            <div
              key={ag.id}
              className="rounded-lg border border-border p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-card-foreground">
                    {ag.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ag.tenure != null
                      ? `${ag.tenure}-month tenure${ag.expiresAt ? ` · expires ${ag.expiresAt.slice(0, 10)}` : ""}`
                      : `Agreement #${ag.id}`}
                  </p>
                </div>
                <Badge variant={phaseBadgeVariant(ag.phase)}>
                  {phaseLabel(ag.phase)}
                </Badge>
              </div>

              {ag.phase === "PENDING_FRANCHISEE_SIGNATURE" &&
                signingId !== ag.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSigningId(ag.id)}
                    className="rounded-lg"
                  >
                    Sign Agreement
                  </Button>
                )}

              {signingId === ag.id && (
                <div className="space-y-2 pt-1 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Your signature from the franchise agreement will be used
                    automatically.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSign}
                      disabled={submitting}
                      className="rounded-lg"
                    >
                      {submitting ? "Signing..." : "Confirm Signature"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSigningId(null)}
                      disabled={submitting}
                      className="rounded-lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DetailDialog>
  );
}
