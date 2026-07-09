"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SignatureDisplay } from "@/components/esignature/SignatureDisplay";
import type {
  ESignaturePadProps,
  ESignatureResult,
} from "@/components/esignature/ESignaturePad";

const ESignaturePad = dynamic<ESignaturePadProps>(
  () =>
    import("@/components/esignature/ESignaturePad").then((m) => ({
      default: m.ESignaturePad,
    })),
  { ssr: false },
);

export interface SignatureCapturePanelProps {
  /** On-file signature image source, when one exists. */
  storedSignature?: string;
  /**
   * Adoption of a freshly drawn/typed signature from the pad. The caller's
   * submit/payload logic stays untouched — this panel only unifies the
   * capture chrome.
   */
  onAdopt: (result: ESignatureResult) => Promise<void> | void;
  /**
   * "Use existing signature" action — rendered only when a storedSignature
   * exists and this callback is provided.
   */
  onUseStored?: () => Promise<void> | void;
  /** e.g. "Franchisee signature". */
  signerLabel: string;
  /** @default "Sign agreement" */
  ctaLabel?: string;
  busy?: boolean;
  /** Default typed-signature name forwarded to the pad. */
  defaultName?: string;
  className?: string;
}

/**
 * The one signature capture flow: on-file preview + "Use existing signature"
 * / "Draw a different signature" actions + the pad dialog. Consent handling
 * stays inside ESignaturePad.
 */
export function SignatureCapturePanel({
  storedSignature,
  onAdopt,
  onUseStored,
  signerLabel,
  ctaLabel = "Sign agreement",
  busy = false,
  defaultName,
  className,
}: SignatureCapturePanelProps) {
  const [padOpen, setPadOpen] = useState(false);

  return (
    <div
      data-testid="signature-capture-panel"
      className={cn("space-y-3", className)}
    >
      <SignatureDisplay
        src={storedSignature}
        signerLabel={signerLabel}
        onFile={!!storedSignature}
        emptyContent={
          <p className="text-xs text-muted-foreground">
            No signature on file yet
          </p>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        {storedSignature && onUseStored ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void onUseStored()}
            disabled={busy}
            className="gap-1.5"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Use existing signature
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={storedSignature && onUseStored ? "outline" : "default"}
          onClick={() => setPadOpen(true)}
          disabled={busy}
          className="gap-1.5"
        >
          <PenLine className="h-3.5 w-3.5" />
          {storedSignature ? "Draw a different signature" : ctaLabel}
        </Button>
      </div>
      <ESignaturePad
        open={padOpen}
        onOpenChange={setPadOpen}
        defaultName={defaultName}
        submitting={busy}
        onAdopt={async (result) => {
          await onAdopt(result);
          setPadOpen(false);
        }}
      />
    </div>
  );
}
