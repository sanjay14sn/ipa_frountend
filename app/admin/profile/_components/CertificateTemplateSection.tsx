"use client";

// PDF.js is loaded dynamically from a CDN script tag; declare its shape so
// we can avoid `(window as any)` casts throughout this file.
declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (params: {
        url: string;
        withCredentials?: boolean;
        isEvalSupported?: boolean;
      }) => {
        promise: Promise<{
          numPages: number;
          getPage: (
            n: number,
          ) => Promise<{
            getViewport: (opts: {
              scale: number;
            }) => { width: number; height: number };
            render: (ctx: object) => { promise: Promise<void> };
          }>;
        }>;
      };
      GlobalWorkerOptions: { workerSrc: string };
    };
    pdfjs?: Window["pdfjsLib"];
  }
}

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  listCertificateTemplates,
  updateCertificateTemplate,
  uploadCertificateTemplate,
  deleteCertificateTemplate,
  type Program,
  type CertificateTemplate,
  type FieldCoordinate,
} from "@/services/program.service";
import { getApiBaseUrl } from "@/lib/api-utils";
import { sendClientLog } from "@/lib/client-telemetry";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CERTIFICATE_FIELDS,
  getFieldDef,
  type CertificateFieldDef,
} from "./certificate-template-fields";

const CertificateTemplateEditor = dynamic(
  () =>
    import("./CertificateTemplateEditor").then((m) => ({
      default: m.CertificateTemplateEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ),
  },
);

interface CertificateTemplateSectionProps {
  program: Program;
  /** Whether this tab is currently active (drives lazy load). */
  isActive: boolean;
}

// Default field placements for a brand-new template.
const DEFAULT_COORDINATES: Record<string, FieldCoordinate> = {
  student_name: { rect: [255, 338, 598, 354], label: "Student Name" },
  student_level: { rect: [184, 299, 359, 315], label: "Student Level" },
  student_program: { rect: [383, 298, 596, 314], label: "Student Program" },
  franchise_name: { rect: [177, 223, 635, 239], label: "Franchise Name" },
  year: { rect: [76, 100, 147, 116], label: "Year" },
  franchisee: { rect: [431, 98, 539, 114], label: "Franchisee" },
};

export function CertificateTemplateSection({
  program,
  isActive,
}: CertificateTemplateSectionProps) {
  // ── Pool of templates for this program ───────────────────────────────────
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  // The selected template id; `"new"` means an unsaved draft.
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);

  // ── Editor state for the selected template ───────────────────────────────
  const [templateName, setTemplateName] = useState("");
  const [templateData, setTemplateData] = useState<Partial<CertificateTemplate>>(
    {
      certificateTitle: "",
      issuerName: "",
      additionalText: "",
      isActive: true,
    },
  );
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(
    null,
  );
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<number | undefined>(undefined);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [fieldCoordinates, setFieldCoordinates] = useState<Record<
    string,
    FieldCoordinate
  > | null>(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pdfScale, setPdfScale] = useState({
    width: 612,
    height: 792,
    scale: 1,
  });
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfRenderSeqRef = useRef(0);
  const loadedForRef = useRef(false);

  // Lazy-load the pool when the tab first becomes active.
  useEffect(() => {
    if (!isActive || loadedForRef.current) return;
    loadedForRef.current = true;
    void loadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const loadPool = async (preferId?: number) => {
    setIsLoadingPool(true);
    try {
      const rows = await listCertificateTemplates(program.id);
      setTemplates(rows);
      const target =
        preferId != null
          ? rows.find((t) => t.id === preferId)
          : selectedId != null && selectedId !== "new"
            ? rows.find((t) => t.id === selectedId)
            : rows[0];
      if (target?.id != null) {
        selectTemplate(target);
      } else if (rows.length === 0) {
        // Empty pool — start a fresh draft.
        startNewTemplate();
      }
    } catch {
      toast.error("Failed to load certificate templates");
    } finally {
      setIsLoadingPool(false);
    }
  };

  const resetEditorState = () => {
    setTemplateFile(null);
    setTemplatePreviewUrl(null);
    setTemplateImageUrl(null);
    setFieldCoordinates(null);
    setSelectedFieldKey(null);
    setIsEditMode(false);
    setIsDirty(false);
  };

  const selectTemplate = (template: CertificateTemplate) => {
    resetEditorState();
    setSelectedId(template.id ?? null);
    setTemplateId(template.id);
    setTemplateName(template.name ?? "");
    setTemplateData({
      certificateTitle: template.certificateTitle ?? "",
      issuerName: template.issuerName ?? "",
      additionalText: template.additionalText ?? "",
      isActive: template.isActive ?? true,
    });
    setFieldCoordinates(template.fieldCoordinates ?? DEFAULT_COORDINATES);
    if (template.templatePdfPath) {
      const baseUrl = getApiBaseUrl();
      // Cache-bust by the template's last-updated stamp (id fallback) so a
      // re-uploaded PDF refetches, without calling an impure clock in render.
      const version = String(template.updatedAt ?? template.id ?? "");
      setTemplatePreviewUrl(
        `${baseUrl}/uploads/${template.templatePdfPath}?t=${encodeURIComponent(version)}`,
      );
    }
    setIsDirty(false);
  };

  const startNewTemplate = () => {
    resetEditorState();
    setSelectedId("new");
    setTemplateId(undefined);
    setTemplateName("");
    setTemplateData({
      certificateTitle: "Certificate of Completion",
      issuerName: "Ideal Play Abacus",
      additionalText: "",
      isActive: true,
    });
    setFieldCoordinates(DEFAULT_COORDINATES);
    setIsDirty(false);
  };

  const handleSaveTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      toast.error("Template name is required");
      return;
    }
    setIsSavingTemplate(true);
    try {
      const certificateTitle =
        typeof templateData.certificateTitle === "string" &&
        templateData.certificateTitle.trim()
          ? templateData.certificateTitle
          : "Certificate of Completion";
      const issuerName =
        typeof templateData.issuerName === "string" &&
        templateData.issuerName.trim()
          ? templateData.issuerName
          : "Ideal Play Abacus";
      const additionalText =
        typeof templateData.additionalText === "string" &&
        templateData.additionalText.trim()
          ? templateData.additionalText
          : undefined;
      const isActive =
        typeof templateData.isActive === "boolean"
          ? templateData.isActive
          : true;

      const templatePayload = {
        name,
        certificateTitle,
        issuerName,
        additionalText,
        fieldCoordinates: fieldCoordinates ?? undefined,
        isActive,
      };

      if (templateFile) {
        await uploadCertificateTemplate(program.id, templateFile, templatePayload);
      } else {
        await updateCertificateTemplate(program.id, {
          id: templateId,
          ...templatePayload,
        });
      }

      toast.success("Certificate template saved successfully");
      setTemplateFile(null);
      setIsEditMode(false);
      setIsDirty(false);
      // Reload the pool; keep the saved template selected when we know its id.
      await loadPool(templateId);
    } catch (error: unknown) {
      toast.error(
        getUserFriendlyMessage(error, "Failed to save certificate template"),
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = () => {
    if (templateId == null) {
      // Unsaved draft — just discard it.
      if (templates.length > 0) {
        selectTemplate(templates[0]);
      } else {
        startNewTemplate();
      }
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const performDeleteTemplate = async () => {
    if (templateId == null) return;
    try {
      await deleteCertificateTemplate(templateId);
      toast.success("Certificate template deleted");
      setSelectedId(null);
      await loadPool();
    } catch (error: unknown) {
      toast.error(
        getUserFriendlyMessage(error, "Failed to delete certificate template"),
      );
    }
  };

  const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;

  const handleTemplateFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file after a discard.
    e.target.value = "";
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      if (file.size > MAX_TEMPLATE_BYTES) {
        toast.error("File is too large — maximum size is 10 MB");
        return;
      }
      setTemplateFile(file);
      const url = URL.createObjectURL(file);
      setTemplatePreviewUrl(url);
      setTemplateImageUrl(null);
      setFieldCoordinates((prev) => prev ?? DEFAULT_COORDINATES);
      setIsDirty(true);
    }
  };

  /** Merge a partial patch into one field's coordinate spec. */
  const updateField = (key: string, patch: Partial<FieldCoordinate>) => {
    setFieldCoordinates((prev) =>
      prev && prev[key] ? { ...prev, [key]: { ...prev[key], ...patch } } : prev,
    );
    setIsDirty(true);
  };

  /** Place a known data field in the middle of the page. */
  const addField = (key: string) => {
    const def = getFieldDef(key);
    if (!def) return;
    const w = def.signature ? 110 : 200;
    const h = 18;
    const cx = pdfScale.width / 2;
    const cy = pdfScale.height / 2;
    setFieldCoordinates((prev) => ({
      ...(prev ?? {}),
      [key]: {
        rect: [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2],
        label: def.label,
      },
    }));
    setSelectedFieldKey(key);
    setIsDirty(true);
  };

  const removeField = (key: string) => {
    setFieldCoordinates((prev) => {
      if (!prev || !prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (selectedFieldKey === key) setSelectedFieldKey(null);
    setIsDirty(true);
  };

  /** Throw away local edits and reload the selected template. */
  const handleDiscard = () => {
    if (selectedId === "new" || templateId == null) {
      startNewTemplate();
      return;
    }
    const saved = templates.find((t) => t.id === templateId);
    if (saved) {
      selectTemplate(saved);
    } else {
      void loadPool();
    }
  };

  // Fields that are not yet placed (all fields apply to every template now).
  const availableFields: CertificateFieldDef[] = CERTIFICATE_FIELDS.filter(
    (f) => !(fieldCoordinates && fieldCoordinates[f.key]),
  );

  // Convert PDF coordinates to screen coordinates (PDF uses bottom-left origin)
  const pdfToScreen = (pdfCoord: number, isY: boolean = false) => {
    const container = pdfContainerRef.current;
    if (!container || !templateImageUrl) return pdfCoord;

    const img = container.querySelector("img");
    if (!img) return pdfCoord;

    const imgRect = img.getBoundingClientRect();
    const pdfWidth = pdfScale.width;
    const pdfHeight = pdfScale.height;
    const scaleX = imgRect.width / pdfWidth;
    const scaleY = imgRect.height / pdfHeight;

    if (isY) {
      return (pdfHeight - pdfCoord) * scaleY;
    }
    return pdfCoord * scaleX;
  };

  // Convert screen coordinates to PDF coordinates
  const screenToPdf = (screenCoord: number, isY: boolean = false) => {
    const container = pdfContainerRef.current;
    if (!container || !templateImageUrl) return screenCoord;

    const img = container.querySelector("img");
    if (!img) return screenCoord;

    const imgRect = img.getBoundingClientRect();
    const pdfWidth = pdfScale.width;
    const pdfHeight = pdfScale.height;
    const scaleX = imgRect.width / pdfWidth;
    const scaleY = imgRect.height / pdfHeight;

    if (isY) {
      return pdfHeight - screenCoord / scaleY;
    }
    return screenCoord / scaleX;
  };

  const handleDragStart = (fieldKey: string, e: React.MouseEvent) => {
    if (!isEditMode || !fieldCoordinates) return;
    e.preventDefault();
    e.stopPropagation();

    const container = pdfContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const field = fieldCoordinates[fieldKey];
    const rect = field.rect ?? [0, 0, 100, 100];
    const width = rect[2] - rect[0];
    const height = rect[3] - rect[1];

    const startX = e.clientX - containerRect.left;
    const startY = e.clientY - containerRect.top;
    const startBoxX = pdfToScreen(rect[0], false);
    const startBoxY = pdfToScreen(rect[1], true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentContainerRect = container.getBoundingClientRect();
      const currentX = moveEvent.clientX - currentContainerRect.left;
      const currentY = moveEvent.clientY - currentContainerRect.top;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      const newBoxX = startBoxX + deltaX;
      const newBoxY = startBoxY + deltaY;

      const newPdfX1 = Math.max(
        0,
        Math.min(screenToPdf(newBoxX, false), pdfScale.width - width),
      );
      const newPdfY1 = Math.max(
        0,
        Math.min(screenToPdf(newBoxY, true), pdfScale.height - height),
      );

      setFieldCoordinates({
        ...fieldCoordinates,
        [fieldKey]: {
          ...field,
          rect: [newPdfX1, newPdfY1, newPdfX1 + width, newPdfY1 + height],
        },
      });
      setIsDirty(true);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Convert PDF to image when preview URL changes. Each run renders into its
  // own canvas and checks the sequence token before committing state — two
  // overlapping runs sharing one canvas corrupts the pdf.js transform
  // (vertically flipped output) and publishes a stale image size.
  useEffect(() => {
    const seq = ++pdfRenderSeqRef.current;
    const loadPdfAsImage = async () => {
      if (!templatePreviewUrl || typeof window === "undefined") return;

      try {
        let pdfjsLib = window.pdfjsLib;

        if (!pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => {
              pdfjsLib = window.pdfjsLib ?? window.pdfjs;
              if (pdfjsLib) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                resolve();
              } else {
                reject(new Error("PDF.js failed to load"));
              }
            };
            script.onerror = () =>
              reject(new Error("Failed to load PDF.js script"));
            document.head.appendChild(script);
          });
        }

        if (!pdfjsLib) throw new Error("PDF.js not available");

        const loadingTask = pdfjsLib.getDocument({
          url: templatePreviewUrl,
          withCredentials: false,
          isEvalSupported: false,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const { width: pdfWidth, height: pdfHeight } = page.getViewport({
          scale: 1.0,
        });

        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        // A newer render started while this one was in flight — drop it.
        if (seq !== pdfRenderSeqRef.current) return;

        setTemplateImageUrl(canvas.toDataURL("image/png"));
        setPdfScale({ width: pdfWidth, height: pdfHeight, scale: 2.0 });
      } catch (error) {
        sendClientLog({
          level: "error",
          event: "pdf-load-error",
          message: "Error loading PDF preview",
          context: { error },
        });
        toast.error("Failed to load PDF preview");
      }
    };

    void loadPdfAsImage();
  }, [templatePreviewUrl]);

  if (!isActive) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-8 text-center text-sm text-muted-foreground">
        Open this tab to load the certificate templates…
      </div>
    );
  }

  if (isLoadingPool && templates.length === 0 && selectedId == null) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-8 text-center text-sm text-muted-foreground">
        Loading templates…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Template pool selector ────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-card-foreground">
            Certificate templates
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={startNewTemplate}
          >
            <Plus className="mr-2 h-4 w-4" />
            New template
          </Button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          This program owns a pool of named templates. Attach any of them to
          levels from the Basic tab; each attached template is issued when a
          student completes that level.
        </p>
        <div className="flex flex-wrap gap-2">
          {templates.length === 0 && selectedId !== "new" ? (
            <span className="text-sm text-muted-foreground">
              No templates yet. Create your first one.
            </span>
          ) : null}
          {templates.map((t) => {
            const isSelected = selectedId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTemplate(t)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-card-foreground hover:bg-muted/50"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="max-w-[200px] truncate">
                  {t.name || t.certificateTitle || `#${t.id}`}
                </span>
                {t.isActive === false ? (
                  <span className="text-[10px] text-muted-foreground">
                    (inactive)
                  </span>
                ) : null}
              </button>
            );
          })}
          {selectedId === "new" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-sm text-primary">
              <FileText className="h-3.5 w-3.5" />
              New template (unsaved)
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Name + delete controls ────────────────────────────────────────── */}
      {selectedId != null ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <div className="min-w-[240px] flex-1 space-y-1">
            <Label htmlFor="cert-template-name" className="text-sm font-medium">
              Template name
            </Label>
            <Input
              id="cert-template-name"
              value={templateName}
              placeholder="e.g. Level 3 Completion"
              onChange={(e) => {
                setTemplateName(e.target.value);
                setIsDirty(true);
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg text-destructive hover:text-destructive"
            onClick={handleDeleteTemplate}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {templateId == null ? "Discard draft" : "Delete template"}
          </Button>
        </div>
      ) : null}

      {selectedId != null ? (
        <CertificateTemplateEditor
          programName={program.name}
          templatePreviewUrl={templatePreviewUrl}
          templateImageUrl={templateImageUrl}
          fieldCoordinates={fieldCoordinates}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          isSavingTemplate={isSavingTemplate}
          isDirty={isDirty}
          handleSaveTemplate={handleSaveTemplate}
          handleDiscard={handleDiscard}
          handleTemplateFileChange={handleTemplateFileChange}
          pdfContainerRef={pdfContainerRef}
          handleDragStart={handleDragStart}
          selectedFieldKey={selectedFieldKey}
          setSelectedFieldKey={setSelectedFieldKey}
          updateField={updateField}
          addField={addField}
          removeField={removeField}
          availableFields={availableFields}
          pdfScale={pdfScale}
        />
      ) : (
        <div className="rounded-lg border border-dashed bg-card px-6 py-8 text-center text-sm text-muted-foreground">
          Select a template above or create a new one.
        </div>
      )}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        variant="destructive"
        title="Delete certificate template?"
        description={`Delete certificate template "${templateName || `#${templateId}`}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          setDeleteConfirmOpen(false);
          await performDeleteTemplate();
        }}
      />
    </div>
  );
}
