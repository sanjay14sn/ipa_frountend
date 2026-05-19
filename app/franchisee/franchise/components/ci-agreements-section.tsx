"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Eye, Loader2, PenLine, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DataTable,
  type DataTableColumn,
  TableLoadingState,
  TablePageShell,
} from "@/components/shared";
import { getErrorMessage } from "@/lib/error-utils";
import {
  type CIAgreementData,
  listCIAgreementsForFranchisee,
  signCIAgreementAsFranchiseeFile,
  getCIAgreementByIdForFranchisee,
} from "@/services/contracting.service";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import { useUser } from "@/context/user-context";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtShort(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "PP");
  } catch {
    return iso ?? "—";
  }
}

const PHASE_CONFIG: Record<
  CIAgreementData["phase"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING_CI_SIGNATURE: { label: "Awaiting CI signature", variant: "secondary" },
  PENDING_FRANCHISEE_SIGNATURE: { label: "Awaiting your signature", variant: "outline" },
  SIGNED: { label: "Signed", variant: "default" },
  EXPIRED: { label: "Expired", variant: "destructive" },
};

function PhaseBadge({ phase }: { phase: CIAgreementData["phase"] }) {
  const { label, variant } = PHASE_CONFIG[phase] ?? { label: phase, variant: "secondary" };
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Sign dialog ──────────────────────────────────────────────────────────────

const MAX_SIG_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";

function SignDialog({
  agreement,
  onSigned,
  onClose,
}: {
  agreement: CIAgreementData | null;
  onSigned: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_SIG_BYTES) {
      toast.error("Signature image must be 5 MB or smaller.");
      return;
    }
    if (!ACCEPT.split(",").some((t) => file.type === t.trim())) {
      toast.error("Use a PNG, JPEG, or WebP image.");
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!selectedFile || !agreement) return;
    setUploading(true);
    try {
      await signCIAgreementAsFranchiseeFile(agreement.id, selectedFile);
      toast.success("CI agreement signed successfully.");
      onSigned();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not upload signature. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !uploading) {
      setPreview(null);
      setSelectedFile(null);
      onClose();
    }
  };

  return (
    <Dialog open={!!agreement} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign CI Agreement</DialogTitle>
          <DialogDescription>
            {agreement?.title ?? "Upload your signature image to sign this agreement."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={onFileChange}
          />

          {preview ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Selected signature:</p>
              <div className="rounded-md border bg-muted/30 p-3 flex items-center justify-center">
                <img
                  src={preview}
                  alt="Signature preview"
                  className="max-h-32 max-w-full object-contain"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Change image
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-muted-foreground/50 hover:bg-muted/20 transition-colors"
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to upload signature</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPEG or WebP · max 5 MB</p>
            </button>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedFile || uploading}
            onClick={handleSubmit}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              "Sign agreement"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── View dialog ─────────────────────────────────────────────────────────────

function ViewDialog({
  agreementId,
  onClose,
}: {
  agreementId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["franchisee-ci-agreement-detail", agreementId],
    queryFn: () => getCIAgreementByIdForFranchisee(agreementId!),
    enabled: agreementId !== null,
  });

  return (
    <Dialog open={agreementId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-[96vw] overflow-y-auto sm:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>Course Instructor Agreement</DialogTitle>
          <DialogDescription>Read-only view of the CI agreement.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading agreement…
          </div>
        ) : !data ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No agreement details found.
          </div>
        ) : (
          <CIAgreementDetail agreement={data} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 10;

export function CIAgreementsSection() {
  const { user } = useUser();
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the active franchise changes
  useEffect(() => {
    setPage(1);
  }, [user?.franchiseId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["franchisee-ci-agreements", user?.franchiseId, page],
    queryFn: () => listCIAgreementsForFranchisee({ page, limit: PAGE_LIMIT }),
    enabled: !!user,
  });

  useEffect(() => {
    if (error) toast.error(getErrorMessage(error, "Failed to load CI agreements"));
  }, [error]);

  const [signingAgreement, setSigningAgreement] = useState<CIAgreementData | null>(null);
  const [viewingAgreementId, setViewingAgreementId] = useState<number | null>(null);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const columns: DataTableColumn<CIAgreementData>[] = [
    {
      key: "id",
      header: "ID",
      className: "w-24 font-mono text-xs",
      render: (r) => r.id,
    },
    {
      key: "phase",
      header: "Status",
      className: "pl-8",
      render: (r) => <PhaseBadge phase={r.phase} />,
    },
    {
      key: "term",
      header: "Term",
      className: "text-sm text-muted-foreground whitespace-nowrap",
      render: (r) =>
        r.validFrom && r.validUntil
          ? `${fmtShort(r.validFrom)} – ${fmtShort(r.validUntil)}`
          : "—",
    },
    {
      key: "sign",
      header: "Action",
      className: "w-56",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="View agreement"
            onClick={() => setViewingAgreementId(r.id)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {r.phase === "PENDING_FRANCHISEE_SIGNATURE" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setSigningAgreement(r)}
            >
              <PenLine className="mr-1.5 h-3.5 w-3.5" />
              Sign agreement
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <TablePageShell
      title="CI agreements"
      description="Agreements with your course instructors. Sign any that are awaiting your signature to activate them."
    >
      {isLoading && rows.length === 0 ? (
        <TableLoadingState message="Loading CI agreements…" />
      ) : (
        <DataTable<CIAgreementData>
          data={rows}
          loading={isLoading}
          columns={columns}
          getRowId={(r) => String(r.id)}
          pagination={{ total, totalPages }}
          currentPage={page}
          onPageChange={setPage}
          renderMainCell={(r) => (
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate max-w-xs">{r.title}</span>
              <span className="text-sm text-muted-foreground truncate max-w-xs">
                {r.instructorName ?? `Instructor #${r.instructorId}`}
              </span>
            </div>
          )}
          emptyMessage="No CI agreements on file yet."
          resultsText={(_c, total) =>
            `${total} CI agreement${total === 1 ? "" : "s"}`
          }
        />
      )}

      <SignDialog
        agreement={signingAgreement}
        onSigned={() => {
          setSigningAgreement(null);
          void refetch();
        }}
        onClose={() => setSigningAgreement(null)}
      />

      <ViewDialog
        agreementId={viewingAgreementId}
        onClose={() => setViewingAgreementId(null)}
      />
    </TablePageShell>
  );
}
