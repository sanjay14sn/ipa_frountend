"use client";

import * as React from "react";
import {
  Check,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Info,
  Plus,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FieldCoordinate } from "@/services/program.service";
import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  FONT_OPTIONS,
  getFieldDef,
  getFontOption,
  type CertificateFieldDef,
} from "./certificate-template-fields";

interface CertificateTemplateEditorProps {
  programName: string;
  templatePreviewUrl: string | null;
  templateImageUrl: string | null;
  fieldCoordinates: Record<string, FieldCoordinate> | null;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  isSavingTemplate: boolean;
  isDirty: boolean;
  handleSaveTemplate: () => void;
  handleDiscard: () => void;
  handleTemplateFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  pdfContainerRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (key: string, e: React.MouseEvent) => void;
  selectedFieldKey: string | null;
  setSelectedFieldKey: (value: string | null) => void;
  updateField: (key: string, patch: Partial<FieldCoordinate>) => void;
  addField: (key: string) => void;
  removeField: (key: string) => void;
  availableFields: CertificateFieldDef[];
  pdfScale: { width: number; height: number; scale: number };
}

const PT_TO_MM = 25.4 / 72;

export function CertificateTemplateEditor({
  programName,
  templatePreviewUrl,
  templateImageUrl,
  fieldCoordinates,
  isEditMode,
  setIsEditMode,
  isSavingTemplate,
  isDirty,
  handleSaveTemplate,
  handleDiscard,
  handleTemplateFileChange,
  pdfContainerRef,
  handleDragStart,
  selectedFieldKey,
  setSelectedFieldKey,
  updateField,
  addField,
  removeField,
  availableFields,
  pdfScale,
}: CertificateTemplateEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const fields = fieldCoordinates ? Object.entries(fieldCoordinates) : [];
  const selectedField =
    selectedFieldKey && fieldCoordinates
      ? fieldCoordinates[selectedFieldKey]
      : null;
  const selectedDef = selectedFieldKey ? getFieldDef(selectedFieldKey) : null;

  // "Preview filled" — render only the sample values, no editing chrome.
  const [previewMode, setPreviewMode] = React.useState(false);

  // Rendered width of the preview image, tracked by a ResizeObserver so the
  // in-box font preview rescales whenever the layout changes for any reason
  // (initial paint, sidebar mount, breakpoint switch, window resize). The
  // boxes themselves are percentage-positioned and never need recomputing.
  const [imgWidth, setImgWidth] = React.useState(0);

  // Default the selected field to the first one once data loads.
  React.useEffect(() => {
    if (!selectedFieldKey && fields.length > 0) {
      setSelectedFieldKey(fields[0][0]);
    }
  }, [selectedFieldKey, fields, setSelectedFieldKey]);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img || !templateImageUrl) {
      setImgWidth(0);
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setImgWidth(entry.contentRect.width);
      }
    });
    observer.observe(img);
    return () => observer.disconnect();
  }, [templateImageUrl]);

  const triggerFileSelect = () => fileInputRef.current?.click();

  // Screen pixels per PDF point at the current image size.
  const screenScale = imgWidth > 0 ? imgWidth / pdfScale.width : 0;

  const pageSizeLabel = `${Math.round(pdfScale.width * PT_TO_MM)} × ${Math.round(
    pdfScale.height * PT_TO_MM,
  )} mm`;

  // Selected-field geometry in a top-left-origin, center-point form.
  const rect = selectedField?.rect ?? [0, 0, 0, 0];
  const centerX = (rect[0] + rect[2]) / 2;
  const centerYTop = pdfScale.height - (rect[1] + rect[3]) / 2;
  const boxWidth = rect[2] - rect[0];
  const boxHeight = rect[3] - rect[1];

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  const setCenter = (cx: number, cyTop: number, w: number) => {
    if (!selectedFieldKey) return;
    const cxC = clamp(cx, 0, pdfScale.width);
    const cyPdf = pdfScale.height - clamp(cyTop, 0, pdfScale.height);
    const wC = clamp(w, 10, pdfScale.width);
    updateField(selectedFieldKey, {
      rect: [
        cxC - wC / 2,
        cyPdf - boxHeight / 2,
        cxC + wC / 2,
        cyPdf + boxHeight / 2,
      ],
    });
  };

  const handleNumberInput =
    (apply: (value: number) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (Number.isFinite(value)) apply(value);
    };

  /** Inline style approximating the backend font on screen. */
  const previewTextStyle = (coord: FieldCoordinate): React.CSSProperties => {
    const fontOpt = getFontOption(coord.font ?? DEFAULT_FONT);
    return {
      fontFamily: fontOpt.css,
      fontWeight: fontOpt.weight,
      fontStyle: fontOpt.style,
      fontSize: `${(coord.size ?? DEFAULT_FONT_SIZE) * screenScale}px`,
      lineHeight: 1,
    };
  };

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
              Upload the printed PDF stationery, then drag the field boxes
              onto the page where each value should print. Text always prints
              centered inside its box.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant={previewMode ? "default" : "outline"}
            size="sm"
            className="rounded-lg"
            onClick={() => setPreviewMode(!previewMode)}
            disabled={!templateImageUrl}
          >
            <Eye className="mr-2 h-4 w-4" />
            {previewMode ? "Exit preview" : "Preview filled"}
          </Button>
          <Button
            type="button"
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            className="rounded-lg"
            onClick={() => setIsEditMode(!isEditMode)}
            disabled={!templatePreviewUrl || !fieldCoordinates || previewMode}
          >
            <Edit className="mr-2 h-4 w-4" />
            {isEditMode ? "Done moving" : "Move fields"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={handleSaveTemplate}
            disabled={isSavingTemplate || !isDirty}
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
              PDF only, max 10 MB · A4 landscape recommended
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
            accept=".pdf"
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
              <div className="border-b border-border bg-primary px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90">
                {templateImageUrl
                  ? `PDF · ${pageSizeLabel}`
                  : "PDF · loading…"}
                {previewMode ? " · preview" : null}
              </div>
              <div
                ref={pdfContainerRef}
                className="relative w-full overflow-auto bg-card"
                style={{ minHeight: "500px" }}
              >
                <div className="relative inline-block w-full">
                  {templateImageUrl ? (
                    <img
                      ref={imgRef}
                      src={templateImageUrl}
                      alt="Template preview"
                      className="block h-auto w-full"
                    />
                  ) : (
                    <div className="flex h-full min-h-[500px] items-center justify-center px-6">
                      <p className="text-sm text-muted-foreground">
                        Loading PDF preview…
                      </p>
                    </div>
                  )}
                  {fieldCoordinates && templateImageUrl ? (
                    <div className="pointer-events-none absolute inset-0">
                      {Object.entries(fieldCoordinates).map(([key, coord]) => {
                        const r = coord.rect;
                        if (!r || r.length < 4) return null;
                        if (coord.hidden) return null;
                        // r = [x1, yBottom, x2, yTop] in PDF points with a
                        // bottom-left origin. Boxes are positioned as
                        // percentages of the page so they track the image
                        // through every layout/zoom change.
                        const leftPct = (r[0] / pdfScale.width) * 100;
                        const topPct =
                          ((pdfScale.height - r[3]) / pdfScale.height) * 100;
                        const widthPct =
                          ((r[2] - r[0]) / pdfScale.width) * 100;
                        const heightPct =
                          ((r[3] - r[1]) / pdfScale.height) * 100;
                        const isSelected = selectedFieldKey === key;
                        const def = getFieldDef(key);
                        const sample = def?.sample ?? coord.label ?? key;
                        const isSignature = Boolean(def?.signature);

                        const previewText =
                          screenScale > 0 ? (
                            isSignature ? (
                              <span
                                className="flex h-full w-full items-center justify-center whitespace-nowrap text-muted-foreground"
                                style={{
                                  fontFamily: "'Segoe Script', cursive",
                                  fontSize: `${14 * screenScale}px`,
                                  lineHeight: 1,
                                }}
                              >
                                {sample}
                              </span>
                            ) : (
                              <span
                                className="flex h-full w-full items-center justify-center whitespace-nowrap text-card-foreground"
                                style={previewTextStyle(coord)}
                              >
                                {/* Backend renderer prints all text in caps. */}
                                {sample.toUpperCase()}
                              </span>
                            )
                          ) : null;

                        if (previewMode) {
                          return (
                            <div
                              key={key}
                              className="absolute"
                              style={{
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: `${widthPct}%`,
                                height: `${heightPct}%`,
                              }}
                            >
                              {previewText}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={key}
                            className={`absolute border-2 ${
                              isSelected
                                ? "border-primary bg-primary/10 pointer-events-auto"
                                : isEditMode
                                  ? "border-primary/70 bg-primary/5 pointer-events-auto"
                                  : "border-primary/40 bg-primary/5 pointer-events-auto"
                            } ${isEditMode ? "cursor-move" : "cursor-pointer"}`}
                            style={{
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${widthPct}%`,
                              height: `${heightPct}%`,
                            }}
                            onMouseDown={(e) => {
                              setSelectedFieldKey(key);
                              if (isEditMode) handleDragStart(key, e);
                            }}
                            title={coord.label}
                          >
                            {/* Live styled preview inside the box */}
                            <div className="absolute inset-0 overflow-visible opacity-70">
                              {previewText}
                            </div>
                            {/* Center anchor dot */}
                            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white" />
                            <div className="absolute -top-5 left-0 inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground whitespace-nowrap">
                              {coord.label ?? def?.label ?? key}
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
                Upload a PDF to start placing fields.
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
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Fields
              </h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={availableFields.length === 0}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                  >
                    <Plus className="h-3 w-3" />
                    Add field
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableFields.map((def) => (
                    <DropdownMenuItem
                      key={def.key}
                      onSelect={() => addField(def.key)}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{def.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {def.description}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Upload a template to see default fields.
              </p>
            ) : (
              <div className="space-y-1">
                {fields.map(([key, coord]) => {
                  const r = coord.rect ?? [0, 0, 0, 0];
                  const cx = Math.round((r[0] + r[2]) / 2);
                  const cyTop = Math.round(
                    pdfScale.height - (r[1] + r[3]) / 2,
                  );
                  const isSelected = selectedFieldKey === key;
                  const isHidden = Boolean(coord.hidden);
                  return (
                    <div
                      key={key}
                      className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:bg-muted/50"
                      } ${isHidden ? "opacity-50" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedFieldKey(key)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <span className="truncate text-sm text-card-foreground">
                          {coord.label ?? getFieldDef(key)?.label ?? key}
                        </span>
                        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                          {cx}, {cyTop}
                        </span>
                      </button>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title={isHidden ? "Show on certificate" : "Hide from certificate"}
                          className="rounded p-0.5 text-muted-foreground hover:text-card-foreground"
                          onClick={() =>
                            updateField(key, { hidden: !isHidden })
                          }
                        >
                          {isHidden ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Remove field"
                          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                          onClick={() => removeField(key)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected field properties */}
          {selectedFieldKey && selectedField ? (
            <div className="px-4 py-3 space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Selected ·{" "}
                <span className="text-card-foreground">
                  {selectedField.label ?? selectedDef?.label ?? selectedFieldKey}
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Center X (pt)
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={Math.round(centerX)}
                    onChange={handleNumberInput((v) =>
                      setCenter(v, centerYTop, boxWidth),
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Center Y (pt)
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={Math.round(centerYTop)}
                    onChange={handleNumberInput((v) =>
                      setCenter(centerX, v, boxWidth),
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Width (pt)
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={Math.round(boxWidth)}
                    onChange={handleNumberInput((v) =>
                      setCenter(centerX, centerYTop, v),
                    )}
                  />
                </div>
                {selectedDef?.signature ? (
                  <div className="col-span-1 flex items-end pb-1">
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      Signature image — size is automatic.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Size (pt)
                      </Label>
                      <Input
                        type="number"
                        className="h-8 text-sm"
                        value={selectedField.size ?? DEFAULT_FONT_SIZE}
                        onChange={handleNumberInput((v) => {
                          if (v >= 4 && v <= 96)
                            updateField(selectedFieldKey, { size: v });
                        })}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Font
                      </Label>
                      <Select
                        value={selectedField.font ?? DEFAULT_FONT}
                        onValueChange={(v) =>
                          updateField(selectedFieldKey, { font: v })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span
                                style={{
                                  fontFamily: opt.css,
                                  fontWeight: opt.weight,
                                  fontStyle: opt.style,
                                }}
                              >
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Source data (the field key IS the binding) */}
          {selectedFieldKey ? (
            <div className="px-4 py-3 space-y-1.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Source data
              </h4>
              <p className="text-sm text-card-foreground">
                {selectedDef?.description ?? "Custom field"}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {selectedFieldKey}
              </p>
            </div>
          ) : null}

          {/* Info card */}
          <div className="mt-auto px-4 py-3">
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Coordinates are in PDF points from the top-left corner. Each
                value prints centered on its box&apos;s dot, in the font and
                size shown in the preview.
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="flex flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isDirty ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={handleDiscard}
            disabled={!isDirty || isSavingTemplate}
          >
            Discard
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={handleSaveTemplate}
            disabled={isSavingTemplate || !isDirty}
          >
            <Check className="mr-2 h-4 w-4" />
            {isSavingTemplate ? "Saving…" : "Save template"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
