"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  agreementSignatureSrc,
  submitFranchiseeSignatureImage,
  type AgreementRecord,
} from "@/services/agreement.service";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { ExternalLink, Loader2, PenLine, Upload } from "lucide-react";
import { queryKeys } from "@/hooks/api/query-keys";

const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";

interface FranchiseAgreementSignaturePanelProps {
  agreement: AgreementRecord | null;
  loading: boolean;
  onAgreementUpdated: (row: AgreementRecord) => void;
}

export function FranchiseAgreementSignaturePanel({
  agreement,
  loading,
  onAgreementUpdated,
}: FranchiseAgreementSignaturePanelProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const sigSrc = agreement ? agreementSignatureSrc(agreement) : null;
  const canUpload = agreement?.status === "PendingSignature";

  const pickFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !agreement) return;
    if (file.size > MAX_SIGNATURE_BYTES) {
      toast.error("Signature image must be 5MB or smaller.");
      return;
    }
    if (!ACCEPT.split(",").some((t) => file.type === t.trim())) {
      toast.error("Use a PNG, JPEG, or WebP image.");
      return;
    }
    setUploading(true);
    try {
      const updated = await submitFranchiseeSignatureImage(agreement.id, file);
      onAgreementUpdated(updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agreements", "list"] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.agreements.detail(agreement.id),
        }),
        queryClient.invalidateQueries({
          queryKey: ["auth", "franchisee-profile"],
        }),
      ]);
      toast.success("Signature saved");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not upload signature"));
    } finally {
      setUploading(false);
    }
  };

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
      <p className="mb-4 text-sm text-muted-foreground">
        Sign on paper and photograph/scan it, or use a clear digital signature
        image (PNG, JPEG, or WebP). Payment unlocks only after the agreement is
        in pending-signature status and your signature is saved.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFileChange}
      />

      {sigSrc ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-border bg-muted/30 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sigSrc}
              alt="Your signature on file"
              className="mx-auto max-h-40 w-auto max-w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {canUpload ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={pickFile}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Replace signature
              </Button>
            ) : null}
            <a
              href={sigSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open file
            </a>
          </div>
        </div>
      ) : (
        <>
          {canUpload ? (
            <Button
              type="button"
              disabled={uploading}
              onClick={pickFile}
              className="w-full rounded-lg sm:w-auto"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload signature image
            </Button>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {agreement.status === "Signed"
                ? "Your agreement is already signed."
                : "Your agreement is not ready for signature yet. Please wait for the signature request."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
