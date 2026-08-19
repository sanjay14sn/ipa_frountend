"use client";

import { AppDialog } from "@/components/shared/dialog";
import type { DialogSize } from "@/components/shared/dialog/tokens";
import { FilePreviewBody } from "./file-preview-body";

export interface PreviewFile {
  /** Absolute or api-relative URL serving the file bytes (session-cookie gated). */
  url: string;
  filename: string;
}

export interface FilePreviewDialogProps {
  files: PreviewFile[];
  /** Index of the open file, or null when the dialog is closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Default "2xl" (documents); "xl" reads better for single images. */
  size?: DialogSize;
}

/**
 * In-app document/image viewer dialog. Pass more than one file to get a
 * document pager in the toolbar. Keying the body on the file URL remounts it
 * per document — resetting page/zoom and fully tearing down the previous one.
 */
export function FilePreviewDialog({
  files,
  index,
  onIndexChange,
  onClose,
  size = "2xl",
}: FilePreviewDialogProps) {
  const file = index === null ? null : (files[index] ?? null);

  return (
    <AppDialog
      open={file !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size={size}
      padding="flush"
      scrollBody
      className="h-[88vh]"
    >
      {file && (
        <FilePreviewBody
          key={file.url}
          source={{ kind: "url", url: file.url, filename: file.filename }}
          asDialogTitle
          position={
            files.length > 1 && index !== null
              ? { index, count: files.length, onIndexChange }
              : null
          }
        />
      )}
    </AppDialog>
  );
}
