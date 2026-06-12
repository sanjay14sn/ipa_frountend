import { PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LabeledValue } from "./labeled-value";
import { fmtDateTime } from "@/lib/ui-helpers";

interface SignatureCardProps {
  title?: string;
  imageSrc?: string | null;
  onFile?: boolean;
  fallbackText?: string;
  dateOfSigning?: string | null;
  capturedAt?: string | null;
  signatoryName?: string;
  className?: string;
}

function SignatureCard({
  title = "Signature",
  imageSrc,
  onFile,
  fallbackText = "Not yet captured",
  dateOfSigning,
  capturedAt,
  signatoryName,
  className,
}: SignatureCardProps) {
  const showOnFile = onFile ?? Boolean(imageSrc);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium">{title}</p>
        </div>
        {showOnFile ? (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-200 bg-emerald-50 py-0 text-[10px] text-emerald-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            On file
          </Badge>
        ) : null}
      </div>
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-3">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={`${title} image`}
            className="max-h-14 w-auto max-w-full object-contain"
          />
        ) : (
          <p className="text-xs text-muted-foreground">{fallbackText}</p>
        )}
      </div>
      {signatoryName ? (
        <p className="text-sm font-medium text-card-foreground">
          {signatoryName}
        </p>
      ) : null}
      {dateOfSigning || capturedAt ? (
        <div className="grid grid-cols-2 gap-2">
          <LabeledValue
            label="Date of signing"
            value={fmtDateTime(dateOfSigning)}
          />
          <LabeledValue label="Captured at" value={fmtDateTime(capturedAt)} />
        </div>
      ) : null}
    </div>
  );
}
