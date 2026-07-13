import { PenLine } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { OnFileBadge } from "@/components/shared/status-badge";

export interface SignatureDisplayProps {
  /** Signature image source (SVG/PNG url or data URI). */
  src?: string;
  signedAt?: string | Date | null;
  /** e.g. "Franchisee signature", "Instructor signature". */
  signerLabel: string;
  /** sm = detail cards (max-h-14), md = max-h-32, lg = agreement pages (max-h-40). */
  maxH?: "sm" | "md" | "lg";
  /** Show the OnFileBadge next to the heading. */
  onFile?: boolean;
  /** Rendered inside the frame when no signature exists (CTA, copy). */
  emptyContent?: React.ReactNode;
  className?: string;
}

const MAX_H = { sm: "max-h-14", md: "max-h-32", lg: "max-h-40" } as const;

/**
 * The one signature display block: PenLine + signer label heading, bordered
 * image frame, optional OnFileBadge and signing date. One copy voice, one
 * frame style at three sizes.
 */
export function SignatureDisplay({
  src,
  signedAt,
  signerLabel,
  maxH = "sm",
  onFile = false,
  emptyContent,
  className,
}: SignatureDisplayProps) {
  return (
    <div data-testid="signature-display" className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <PenLine className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">{signerLabel}</p>
        {onFile ? <OnFileBadge /> : null}
      </div>
      {src ? (
        <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- API-served signature behind session cookies; next/image optimization can't forward credentials */}
          <img
            src={src}
            alt={signerLabel}
            className={cn("w-auto max-w-full object-contain", MAX_H[maxH])}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 py-3">
          {emptyContent ?? (
            <p className="text-xs text-muted-foreground">
              No signature on file
            </p>
          )}
        </div>
      )}
      {signedAt ? (
        <p className="text-xs text-muted-foreground">
          Signed {formatDate(signedAt)}
        </p>
      ) : null}
    </div>
  );
}
