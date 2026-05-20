"use client";

import {
  agreementSignatureSrc,
  franchiseeProfileSignatureSrc,
  type AgreementRecord,
} from "@/services/agreement.service";
import { CheckCircle, ExternalLink, Loader2, PenLine } from "lucide-react";
import { useUser } from "@/context/user-context";

interface FranchiseAgreementSignaturePanelProps {
  agreement: AgreementRecord | null;
  loading: boolean;
}

/**
 * Step 3 display — read-only. Shows whichever applies:
 *
 *   - "Loading…" while the agreement record is in flight
 *   - "Already signed" confirmation + the applied signature image
 *   - On-file signature preview with a hint that the franchisee will sign
 *     with it (button lives in the page footer beside Next)
 *   - A "no signature yet — upload one" hint (button lives in the page
 *     footer beside Next)
 *   - A status hint when the agreement isn't in a signable state
 *
 * The two action paths (Sign-with-existing / Upload-and-sign) are owned by
 * the parent so they can sit beside the navigation buttons. This component
 * is intentionally button-free.
 */
export function FranchiseAgreementSignaturePanel({
  agreement,
  loading,
}: FranchiseAgreementSignaturePanelProps) {
  const { user } = useUser();

  const profileSignatureSrc = franchiseeProfileSignatureSrc(
    user?.profile?.franchiseeSignature,
  );
  const onAgreementSrc = agreement ? agreementSignatureSrc(agreement) : null;
  const previewSrc = onAgreementSrc ?? profileSignatureSrc;

  const alreadySigned = Boolean(agreement?.signed);
  const canSign = agreement?.status === "Approved" && !alreadySigned;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading agreement record for signature…
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
        Your agreement is still being prepared. Signature and payment will be
        available after approval and agreement issuance.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <PenLine className="h-4 w-4" />
        </span>
        <h3 className="text-base font-medium text-card-foreground">
          Your signature
        </h3>
      </div>

      {alreadySigned ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            Agreement signed — continue to payment to activate this program.
          </div>
          {previewSrc ? (
            <div className="overflow-hidden rounded-lg border border-border bg-muted/30 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt="Your signature on this agreement"
                className="mx-auto max-h-40 w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      ) : canSign && profileSignatureSrc ? (
        // On-file signature — the franchisee will reuse it via the
        // "Sign with this signature" button in the footer.
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We have your signature on file from your franchise profile. Use{" "}
            <strong>Sign with this signature</strong> below to apply it to this
            program agreement, or <strong>Upload a different signature</strong>{" "}
            to replace it.
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-muted/30 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profileSignatureSrc}
              alt="Your signature on file"
              className="mx-auto max-h-40 w-auto max-w-full object-contain"
            />
          </div>
          <a
            href={profileSignatureSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open file
          </a>
        </div>
      ) : canSign ? (
        // No on-file signature — upload-and-sign flow (button in footer).
        <p className="text-sm text-muted-foreground">
          Sign on paper and photograph/scan it, or use a clear digital signature
          image (PNG, JPEG, or WebP). Use <strong>Upload and sign</strong> below
          to attach it. The image will be saved to your profile for future
          agreements.
        </p>
      ) : (
        // Status hint for not-signable states.
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {agreement.status === "Valid"
            ? "Your agreement is already in force."
            : agreement.status === "Suspended"
              ? "This agreement is currently suspended."
              : agreement.status === "Void"
                ? "This agreement has been voided."
                : "Your agreement is not yet approved by the admin. Signing unlocks once admin issues the agreement."}
        </div>
      )}
    </div>
  );
}
