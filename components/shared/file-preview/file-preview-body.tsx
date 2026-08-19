"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

import { api } from "@/lib/axios";
import { triggerBlobDownload } from "@/lib/download";
import { loadPdfjs } from "@/lib/pdfjs";
import { cn } from "@/lib/utils";
import {
  AppDialogDescription,
  AppDialogTitle,
} from "@/components/shared/dialog/AppDialog";
import { Button } from "@/components/ui/button";

/**
 * Where the preview bytes come from.
 * - "url": absolute or api-relative URL fetched through the shared axios
 *   instance (session cookie + 401 handling); `blob:`/`data:` URLs are
 *   fetched natively since they never need credentials.
 * - "blob": bytes already in memory (e.g. a POST-generated preview).
 */
export type FilePreviewSource =
  | { kind: "url"; url: string; filename: string }
  | { kind: "blob"; blob: Blob; filename: string };

export interface FilePreviewBodyProps {
  source: FilePreviewSource;
  /** Multi-document pager, rendered in the toolbar when present. */
  position?: {
    index: number;
    count: number;
    onIndexChange: (index: number) => void;
  } | null;
  /**
   * Wrap the filename in the Radix dialog title (a11y). Set by
   * FilePreviewDialog only — embedded hosts already own their title.
   */
  asDialogTitle?: boolean;
  /** Toolbar Download button. Default true. */
  showDownload?: boolean;
  className?: string;
}

type Content =
  | { kind: "loading" }
  | { kind: "image"; objectUrl: string; blob: Blob }
  | { kind: "pdf"; doc: PDFDocumentProxy; pageCount: number; blob: Blob }
  | { kind: "unsupported"; blob: Blob }
  | { kind: "error" };

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.25;

/**
 * In-app preview for PDFs and images: images render as a blob object URL,
 * PDFs through pdf.js one page at a time on a single canvas (memory stays
 * O(1) in page count). Hosts should key this component on the source URL so
 * switching documents remounts it — that resets page/zoom and tears the
 * previous document fully down.
 */
export function FilePreviewBody({
  source,
  position = null,
  asDialogTitle = false,
  showDownload = true,
  className,
}: FilePreviewBodyProps) {
  const [content, setContent] = useState<Content>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sourceUrl = source.kind === "url" ? source.url : null;
  const sourceBlob = source.kind === "blob" ? source.blob : null;

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    let objectUrl: string | null = null;
    let doc: PDFDocumentProxy | null = null;
    (async () => {
      let blob: Blob;
      if (sourceBlob) {
        blob = sourceBlob;
      } else if (/^(blob|data):/.test(sourceUrl ?? "")) {
        const res = await fetch(sourceUrl as string, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`file fetch ${res.status}`);
        blob = await res.blob();
      } else {
        const res = await api.get<Blob>(sourceUrl as string, {
          responseType: "blob",
          signal: ctrl.signal,
        });
        blob = res.data;
      }
      if (blob.type.startsWith("image/")) {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) return;
        setContent({ kind: "image", objectUrl, blob });
      } else if (blob.type.startsWith("application/pdf")) {
        const pdfjs = await loadPdfjs();
        doc = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
        if (cancelled) return;
        setContent({ kind: "pdf", doc, pageCount: doc.numPages, blob });
      } else if (!cancelled) {
        setContent({ kind: "unsupported", blob });
      }
    })().catch(() => {
      if (!cancelled) setContent({ kind: "error" });
    });
    return () => {
      cancelled = true;
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      void doc?.loadingTask.destroy().catch(() => {});
    };
  }, [sourceUrl, sourceBlob, attempt]);

  // Re-render the current PDF page whenever page/zoom changes; rapid flips
  // cancel the in-flight render (RenderingCancelledException — swallowed).
  useEffect(() => {
    if (content.kind !== "pdf") return;
    const canvas = canvasRef.current;
    const scroller = scrollRef.current;
    if (!canvas || !scroller) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    (async () => {
      const pdfPage = await content.doc.getPage(page);
      if (cancelled) return;
      const base = pdfPage.getViewport({ scale: 1 });
      // Scale 1 = fit the scroller width; zoom multiplies from there. DPR is
      // clamped so high-density phones don't rasterize 9x the pixels.
      const fitWidth = Math.max(scroller.clientWidth - 48, 200);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({
        scale: (fitWidth / base.width) * zoom * dpr,
      });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      task = pdfPage.render({ canvas, viewport });
      await task.promise;
    })().catch(() => {});
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [content, page, zoom]);

  const pageCount = content.kind === "pdf" ? content.pageCount : 0;
  const downloadBlob =
    content.kind === "image" || content.kind === "pdf" || content.kind === "unsupported"
      ? content.blob
      : null;

  const retry = () => {
    setContent({ kind: "loading" });
    setPage(1);
    setAttempt((a) => a + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const delta = e.key === "ArrowLeft" ? -1 : 1;
    if (pageCount > 1) {
      e.preventDefault();
      setPage((p) => Math.min(Math.max(p + delta, 1), pageCount));
    } else if (position) {
      const next = position.index + delta;
      if (next >= 0 && next < position.count) {
        e.preventDefault();
        position.onIndexChange(next);
      }
    }
  };

  return (
    <div
      data-testid="file-preview-body"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden outline-none",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-3 pl-4",
          asDialogTitle ? "pr-14" : "pr-4",
        )}
      >
        {asDialogTitle ? (
          <>
            <AppDialogTitle className="min-w-0 flex-1 basis-40 truncate text-sm font-semibold leading-normal text-card-foreground">
              {source.filename}
            </AppDialogTitle>
            <AppDialogDescription className="sr-only">
              Document preview
            </AppDialogDescription>
          </>
        ) : (
          <p className="min-w-0 flex-1 basis-40 truncate text-sm font-semibold text-card-foreground">
            {source.filename}
          </p>
        )}
        {position && (
          <ToolbarGroup>
            <ToolbarButton
              label="Previous document"
              disabled={position.index === 0}
              onClick={() => position.onIndexChange(position.index - 1)}
            >
              <ChevronLeft size={16} />
            </ToolbarButton>
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
              Document {position.index + 1} / {position.count}
            </span>
            <ToolbarButton
              label="Next document"
              disabled={position.index === position.count - 1}
              onClick={() => position.onIndexChange(position.index + 1)}
            >
              <ChevronRight size={16} />
            </ToolbarButton>
          </ToolbarGroup>
        )}
        {pageCount > 1 && (
          <ToolbarGroup>
            <ToolbarButton
              label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </ToolbarButton>
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
              Page {page} / {pageCount}
            </span>
            <ToolbarButton
              label="Next page"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </ToolbarButton>
          </ToolbarGroup>
        )}
        {(content.kind === "image" || content.kind === "pdf") && (
          <ToolbarGroup>
            <ToolbarButton
              label="Zoom out"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoom((z) => Math.max(z / ZOOM_STEP, ZOOM_MIN))}
            >
              <ZoomOut size={16} />
            </ToolbarButton>
            <span className="w-11 text-center text-xs font-medium text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <ToolbarButton
              label="Zoom in"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoom((z) => Math.min(z * ZOOM_STEP, ZOOM_MAX))}
            >
              <ZoomIn size={16} />
            </ToolbarButton>
          </ToolbarGroup>
        )}
        {showDownload && downloadBlob && (
          <ToolbarGroup>
            <ToolbarButton
              label="Download"
              onClick={() => triggerBlobDownload(downloadBlob, source.filename)}
            >
              <Download size={16} />
            </ToolbarButton>
          </ToolbarGroup>
        )}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-muted">
        <div className="flex min-h-full w-max min-w-full p-6">
          {content.kind === "loading" && (
            <p className="m-auto inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading preview…
            </p>
          )}
          {content.kind === "error" && (
            <div className="m-auto flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load preview
              </p>
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </div>
          )}
          {content.kind === "unsupported" && (
            <div className="m-auto flex flex-col items-center gap-1">
              <p className="text-sm font-medium text-card-foreground">
                This file can&apos;t be previewed
              </p>
              {showDownload && (
                <p className="text-xs text-muted-foreground">
                  Use Download to save it instead.
                </p>
              )}
            </div>
          )}
          {content.kind === "image" && (
            // Plain <img>: a blob object URL from an authenticated fetch —
            // next/image can't optimize it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.objectUrl}
              alt={source.filename}
              className={cn(
                "m-auto rounded-md",
                zoom === 1 && "max-h-[70vh] max-w-full",
              )}
              style={zoom !== 1 ? { width: `${zoom * 100}%` } : undefined}
            />
          )}
          {/* Always mounted so the ref exists before the first render pass. */}
          <canvas
            ref={canvasRef}
            className={cn(
              "m-auto rounded-md shadow-md",
              content.kind !== "pdf" && "hidden",
            )}
          />
        </div>
      </div>
    </div>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-1">
      {children}
    </div>
  );
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}
