"use client";

import * as React from "react";
import {
  Check,
  Edit,
  Eye,
  FileText,
  Info,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldCoordinate } from "@/services/program.service";

interface CertificateTemplateEditorProps {
  programName: string;
  templatePreviewUrl: string | null;
  templateImageUrl: string | null;
  fieldCoordinates: Record<string, FieldCoordinate> | null;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  isSavingTemplate: boolean;
  handleSaveTemplate: () => void;
  handleTemplateFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  pdfContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pdfToScreen: (value: number, isYAxis: boolean) => number;
  handleDragStart: (key: string, e: React.MouseEvent) => void;
  selectedFieldKey: string | null;
  setSelectedFieldKey: (value: string | null) => void;
}

const FONT_OPTIONS = [
  { value: "cursive-pacifico", label: "Cursive · Pacifico" },
  { value: "serif-merriweather", label: "Serif · Merriweather" },
  { value: "sans-inter", label: "Sans · Inter" },
  { value: "mono-jetbrains", label: "Mono · JetBrains" },
];

const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const BIND_OPTIONS = [
  { value: "student.full_name", label: "student.full_name" },
  { value: "student.roll_number", label: "student.roll_number" },
  { value: "level.name", label: "level.name" },
  { value: "program.name", label: "program.name" },
  { value: "date.issued", label: "date.issued" },
  { value: "franchise.name", label: "franchise.name" },
];

export function CertificateTemplateEditor({
  programName,
  templatePreviewUrl,
  templateImageUrl,
  fieldCoordinates,
  isEditMode,
  setIsEditMode,
  isSavingTemplate,
  handleSaveTemplate,
  handleTemplateFileChange,
  pdfContainerRef,
  canvasRef,
  pdfToScreen,
  handleDragStart,
  selectedFieldKey,
  setSelectedFieldKey,
}: CertificateTemplateEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fields = fieldCoordinates ? Object.entries(fieldCoordinates) : [];
  const selectedField =
    selectedFieldKey && fieldCoordinates
      ? fieldCoordinates[selectedFieldKey]
      : null;

  // Bump this whenever the preview image's rendered dimensions change
  // (initial load, src swap, viewport resize). The overlay boxes call
  // pdfToScreen() during render, which reads getBoundingClientRect() —
  // so we just need a state nonce to force a re-render after the image
  // finishes laying out.
  const [imageNonce, setImageNonce] = React.useState(0);

  // Default the selected field to the first one once data loads.
  React.useEffect(() => {
    if (!selectedFieldKey && fields.length > 0) {
      setSelectedFieldKey(fields[0][0]);
    }
  }, [selectedFieldKey, fields, setSelectedFieldKey]);

  // Reset the nonce when the image src changes so pdfToScreen recomputes
  // against the new image once it loads.
  React.useEffect(() => {
    setImageNonce(0);
  }, [templateImageUrl]);

  // Recalculate overlay positions on viewport resize (image is responsive).
  React.useEffect(() => {
    if (!templateImageUrl) return;
    const handleResize = () => setImageNonce((n) => n + 1);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [templateImageUrl]);

  const triggerFileSelect = () => fileInputRef.current?.click();

  const fmtCoord = (n?: number) =>
    typeof n === "number" ? Math.round(n).toString() : "—";

  return (
    <div className="flex flex-col font-sans">
      {/* ── Top header ───────────────────────────────────────────── */}
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="flex items-start gap-2 min-w-0">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-card-foreground">
                Certificate template
              </h3>
              <span className="text-sm text-card-foreground">
                {programName}
              </span>
            </div>
            <p className="max-w-2xl text-xs leading-snug text-muted-foreground">
              Upload the printed PDF stationery, then drag the field anchors
              onto the page where each value should print. Coordinates save
              with the template.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-lg">
            <Eye className="mr-2 h-4 w-4" />
            Preview filled
          </Button>
          <Button
            type="button"
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            className="rounded-lg"
            onClick={() => setIsEditMode(!isEditMode)}
            disabled={!templatePreviewUrl || !fieldCoordinates}
          >
            <Edit className="mr-2 h-4 w-4" />
            {isEditMode ? "View coordinates" : "Edit coordinates"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={handleSaveTemplate}
            disabled={isSavingTemplate}
          >
            <Check className="mr-2 h-4 w-4" />
            {isSavingTemplate ? "Saving…" : "Save template"}
          </Button>
        </div>
      </header>

      {/* ── Upload card ──────────────────────────────────────────── */}
      <div className="border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Upload className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-card-foreground">
              Upload certificate PDF
            </div>
            <div className="text-xs text-muted-foreground">
              PDF or PNG, max 10 MB · A4 landscape recommended
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={triggerFileSelect}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png"
            className="hidden"
            onChange={handleTemplateFileChange}
          />
        </div>
      </div>

      {/* ── Main 2-column body ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* LEFT — PDF preview */}
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          {templatePreviewUrl ? (
            <div className="overflow-hidden">
              <div className="border-b border-border bg-[#0d3d63] px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-white/90">
                PDF · A4 landscape · 297 × 210 mm
              </div>
              <div
                ref={pdfContainerRef}
                className="relative w-full overflow-auto bg-card"
                style={{ minHeight: "500px" }}
              >
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  style={{ display: "none" }}
                />
                <div className="relative inline-block w-full">
                  {templateImageUrl ? (
                    <img
                      src={templateImageUrl}
                      alt="Template preview"
                      className="block h-auto w-full"
                      onLoad={() => setImageNonce((n) => n + 1)}
                    />
                  ) : (
                    <div className="flex h-full min-h-[500px] items-center justify-center px-6">
                      <p className="text-sm text-muted-foreground">
                        Loading PDF preview…
                      </p>
                    </div>
                  )}
                  {fieldCoordinates && templateImageUrl && imageNonce > 0 ? (
                    <div className="pointer-events-none absolute inset-0">
                      {Object.entries(fieldCoordinates).map(([key, coord]) => {
                        const r = coord.rect;
                        if (!r || r.length < 4) return null;
                        const x1 = pdfToScreen(r[0], false);
                        const y1 = pdfToScreen(r[1], true);
                        const x2 = pdfToScreen(r[2], false);
                        const y2 = pdfToScreen(r[3], true);
                        const width = x2 - x1;
                        const height = y2 - y1;
                        const isSelected = selectedFieldKey === key;
                        return (
                          <div
                            key={key}
                            className={`absolute border-2 ${
                              isSelected
                                ? "border-primary bg-primary/15 pointer-events-auto"
                                : isEditMode
                                  ? "border-primary/70 bg-primary/5 cursor-move pointer-events-auto"
                                  : "border-primary/40 bg-primary/5"
                            } ${isEditMode ? "cursor-move" : "cursor-pointer"}`}
                            style={{
                              left: `${x1}px`,
                              top: `${y1}px`,
                              width: `${width}px`,
                              height: `${height}px`,
                            }}
                            onMouseDown={(e) => {
                              setSelectedFieldKey(key);
                              if (isEditMode) handleDragStart(key, e);
                            }}
                            title={coord.label}
                          >
                            <div className="absolute -top-5 left-0 inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground whitespace-nowrap">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                              {coord.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[500px] flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-card-foreground">
                No template uploaded yet
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Upload a PDF or PNG to start placing field anchors.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 rounded-lg"
                onClick={triggerFileSelect}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose file
              </Button>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <aside className="flex flex-col divide-y divide-border">
          {/* Fields list */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Fields
              </h4>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add field
              </button>
            </div>
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Upload a template to see default fields.
              </p>
            ) : (
              <div className="space-y-1">
                {fields.map(([key, coord]) => {
                  const r = coord.rect ?? [0, 0, 0, 0];
                  const x = r[0];
                  const y = r[1];
                  const isSelected = selectedFieldKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedFieldKey(key)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <span className="truncate text-sm text-card-foreground">
                          {coord.label ?? key}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
                        <span>
                          {fmtCoord(x)}, {fmtCoord(y)}
                        </span>
                        <Eye className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected field properties */}
          {selectedFieldKey && selectedField ? (
            <div className="px-4 py-3 space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Selected ·{" "}
                <span className="text-card-foreground">
                  {selectedField.label ?? selectedFieldKey}
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    X (mm)
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={fmtCoord(selectedField.rect?.[0])}
                    readOnly
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Y (mm)
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={fmtCoord(selectedField.rect?.[1])}
                    readOnly
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Width
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    defaultValue={120}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Align
                  </Label>
                  <Select defaultValue="center">
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALIGN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Font
                  </Label>
                  <Select defaultValue="cursive-pacifico">
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Size
                  </Label>
                  <Input
                    type="text"
                    className="h-8 text-sm"
                    defaultValue="22 pt"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Source data binding */}
          {selectedFieldKey ? (
            <div className="px-4 py-3 space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Source data
              </h4>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Bind to
                </Label>
                <Select defaultValue="student.full_name">
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BIND_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {/* Info card */}
          <div className="mt-auto px-4 py-3">
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Coordinates are in PDF points from the top-left corner. They
                print pixel-identical on the uploaded template.
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="flex flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          All changes auto-saved · last saved just now
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
          >
            Discard
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={handleSaveTemplate}
            disabled={isSavingTemplate}
          >
            <Check className="mr-2 h-4 w-4" />
            {isSavingTemplate ? "Saving…" : "Publish changes"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
