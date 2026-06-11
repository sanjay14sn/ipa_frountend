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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getCertificateTemplate,
  updateCertificateTemplate,
  uploadCertificateTemplate,
  type Program,
  type CertificateTemplate,
  type FieldCoordinate,
} from "@/services/program.service";
import { getApiBaseUrl } from "@/lib/api-utils";
import { sendClientLog } from "@/lib/client-telemetry";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import dynamic from "next/dynamic";
import { useStreamsByProgram } from "@/hooks/api/stream.hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function CertificateTemplateSection({
  program,
  isActive,
}: CertificateTemplateSectionProps) {
  const [templateData, setTemplateData] = useState<
    Partial<CertificateTemplate>
  >({
    certificateTitle: "",
    issuerName: "",
    signatureField1Label: "",
    signatureField1Name: "",
    signatureField2Label: "",
    signatureField2Name: "",
    additionalText: "",
    isActive: true,
  });
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(
    null,
  );
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<number | undefined>(undefined);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [fieldCoordinates, setFieldCoordinates] = useState<Record<
    string,
    FieldCoordinate
  > | null>(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const { data: streams } = useStreamsByProgram(program.id);
  const [pdfScale, setPdfScale] = useState({
    width: 612,
    height: 792,
    scale: 1,
  });
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedForRef = useRef(false);

  // Lazy-load template when tab first becomes active
  useEffect(() => {
    if (!isActive || loadedForRef.current) return;
    loadedForRef.current = true;
    void loadCertificateTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Reset editor state and reload when stream selection changes
  useEffect(() => {
    if (!isActive) return;
    setTemplateFile(null);
    setTemplatePreviewUrl(null);
    setTemplateImageUrl(null);
    setFieldCoordinates(null);
    setTemplateId(undefined);
    setIsEditMode(false);
    void loadCertificateTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStreamId]);

  const defaultCoordinates: Record<string, FieldCoordinate> = {
    student_name: { rect: [255, 338, 598, 354], label: "Student Name" },
    student_level: { rect: [184, 299, 359, 315], label: "Student Level" },
    student_program: { rect: [383, 298, 596, 314], label: "Student Program" },
    franchise_name: { rect: [177, 223, 635, 239], label: "Franchise Name" },
    year: { rect: [76, 100, 147, 116], label: "Year" },
    franchisee: { rect: [431, 98, 539, 114], label: "Franchisee" },
  };

  const loadCertificateTemplate = async () => {
    setIsLoadingTemplate(true);
    setIsEditMode(false);
    try {
      const template = await getCertificateTemplate(program.id, { streamId: selectedStreamId ?? undefined });
      setTemplateId(template?.id);
      if (template) {
        setTemplateData({
          certificateTitle: template.certificateTitle,
          issuerName: template.issuerName,
          signatureField1Label: template.signatureField1Label || "",
          signatureField1Name: template.signatureField1Name || "",
          signatureField2Label: template.signatureField2Label || "",
          signatureField2Name: template.signatureField2Name || "",
          additionalText: template.additionalText || "",
          isActive: template.isActive,
        });
        setFieldCoordinates(
          template.fieldCoordinates ?? defaultCoordinates,
        );
        if (template.templatePdfPath) {
          const baseUrl = getApiBaseUrl();
          setTemplatePreviewUrl(
            `${baseUrl}/uploads/${template.templatePdfPath}?t=${Date.now()}`,
          );
          setTemplateImageUrl(null);
        }
      } else {
        setTemplateData({
          certificateTitle: "Certificate of Completion",
          issuerName: "Ideal Play Abacus",
          signatureField1Label: "",
          signatureField1Name: "",
          signatureField2Label: "",
          signatureField2Name: "",
          additionalText: "",
          isActive: true,
        });
        setTemplatePreviewUrl(null);
        setFieldCoordinates(defaultCoordinates);
      }
    } catch {
      toast.error("Failed to load certificate template");
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleSaveTemplate = async () => {
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
        certificateTitle,
        issuerName,
        additionalText,
        fieldCoordinates: fieldCoordinates ?? undefined,
        isActive,
      };

      if (templateFile) {
        await uploadCertificateTemplate(
          program.id,
          templateFile,
          templatePayload,
          selectedStreamId,
        );
      } else {
        await updateCertificateTemplate(program.id, {
          id: templateId,
          ...templatePayload,
        });
      }

      toast.success("Certificate template saved successfully");
      setIsEditMode(false);

      const updatedTemplate = await getCertificateTemplate(program.id, { streamId: selectedStreamId ?? undefined });
      if (updatedTemplate?.id) setTemplateId(updatedTemplate.id);
      if (updatedTemplate?.templatePdfPath) {
        const baseUrl = getApiBaseUrl();
        setTemplatePreviewUrl(
          `${baseUrl}/uploads/${updatedTemplate.templatePdfPath}?t=${Date.now()}`,
        );
        setTemplateImageUrl(null);
      }
      if (updatedTemplate?.fieldCoordinates) {
        setFieldCoordinates(updatedTemplate.fieldCoordinates);
      }
    } catch (error: unknown) {
      toast.error(
        getUserFriendlyMessage(
          error,
          "Failed to save certificate template",
        ),
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleTemplateFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      setTemplateFile(file);
      const url = URL.createObjectURL(file);
      setTemplatePreviewUrl(url);
      setTemplateImageUrl(null);
      setFieldCoordinates(defaultCoordinates);
    }
  };

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
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Convert PDF to image when preview URL changes
  useEffect(() => {
    const loadPdfAsImage = async () => {
      if (
        !templatePreviewUrl ||
        !canvasRef.current ||
        typeof window === "undefined"
      )
        return;

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
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

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

  // Update scale on window resize
  useEffect(() => {
    const handleResize = () => {
      if (templateImageUrl && pdfContainerRef.current) {
        setPdfScale((prev) => ({ ...prev }));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [templateImageUrl]);

  if (!isActive) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-8 text-center text-sm text-muted-foreground">
        Open this tab to load the certificate template…
      </div>
    );
  }

  if (isLoadingTemplate) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-8 text-center text-sm text-muted-foreground">
        Loading template…
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 max-w-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Certificate type
        </label>
        <Select
          value={selectedStreamId == null ? "level" : String(selectedStreamId)}
          onValueChange={(v) =>
            setSelectedStreamId(v === "level" ? null : Number(v))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="level">Level certificate (program default)</SelectItem>
            {(streams ?? []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                Stream completion — {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <CertificateTemplateEditor
        programName={program.name}
        templatePreviewUrl={templatePreviewUrl}
        templateImageUrl={templateImageUrl}
        fieldCoordinates={fieldCoordinates}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        isSavingTemplate={isSavingTemplate}
        handleSaveTemplate={handleSaveTemplate}
        handleTemplateFileChange={handleTemplateFileChange}
        pdfContainerRef={pdfContainerRef}
        canvasRef={canvasRef}
        pdfToScreen={pdfToScreen}
        handleDragStart={handleDragStart}
        selectedFieldKey={selectedFieldKey}
        setSelectedFieldKey={setSelectedFieldKey}
      />
    </>
  );
}
