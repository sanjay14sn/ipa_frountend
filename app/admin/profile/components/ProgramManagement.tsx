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
      }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getViewport: (opts: { scale: number }) => { width: number; height: number }; render: (ctx: object) => { promise: Promise<void> } }> }> };
      GlobalWorkerOptions: { workerSrc: string };
    };
    pdfjs?: Window["pdfjsLib"];
  }
}

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  createProgram,
  updateProgram,
  deleteProgram,
  type Program,
  getCertificateTemplate,
  updateCertificateTemplate,
  uploadCertificateTemplate,
  type CertificateTemplate,
  type FieldCoordinate,
} from "@/services/program.service";
import {
  ConfirmDialog,
  DialogFormField,
  FormDialog,
} from "@/components/shared/dialog";
import { PageTabs, TabsContent as PageTabsContent } from "@/components/shared/page-tabs";
import { LevelManagement } from "./LevelManagement";
import { CITrainingLevelManagement } from "./CITrainingLevelManagement";
import { ProgramKitManagement } from "./ProgramKitManagement";
import { StreamManagement } from "./StreamManagement";
import dynamic from "next/dynamic";

const CertificateTemplateEditor = dynamic(
  () => import("./CertificateTemplateEditor").then((m) => ({ default: m.CertificateTemplateEditor })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div> },
);
import { getApiBaseUrl } from "@/lib/api-utils";
import type { Stream } from "@/services/stream.service";
import type { StreamTransition } from "@/services/stream-transition.service";
import { sendClientLog } from "@/lib/client-telemetry";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStreamsByProgram } from "@/hooks/api/stream.hooks";
import { useStreamTransitionsByProgram } from "@/hooks/api/stream-transition.hooks";
import { usePrograms, invalidatePrograms } from "@/hooks/api/program.hooks";
import { getUserFriendlyMessage } from "@/lib/error-utils";

interface BasicProgramCatalogPanelProps {
  programId: number;
  programName: string;
  catalogVersion: number;
  onCatalogChange: () => void;
}

function BasicProgramCatalogPanel({
  programId,
  programName,
  catalogVersion,
  onCatalogChange,
}: BasicProgramCatalogPanelProps) {
  const streamsQuery = useStreamsByProgram(programId);
  const transitionsQuery = useStreamTransitionsByProgram(programId);
  const streams = (streamsQuery.data ?? []) as Stream[];
  const transitions = (transitionsQuery.data ?? []) as StreamTransition[];
  const isLoading = streamsQuery.isLoading || transitionsQuery.isLoading;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-500 shadow-sm">
          Loading streams...
        </div>
      ) : null}
      {!isLoading ? (
        <>
          <LevelManagement
            programId={programId}
            programName={programName}
            initialStreams={streams}
            initialTransitions={transitions}
            skipCatalogLoad
            catalogVersion={catalogVersion}
          />
          <StreamManagement
            programId={programId}
            programName={programName}
            compact
            initialStreams={streams}
            initialTransitions={transitions}
            skipInitialLoad
            onCatalogChange={onCatalogChange}
          />
        </>
      ) : null}
    </div>
  );
}

function CITrainingCatalogPanel({
  programId,
  programName,
}: {
  programId: number;
  programName: string;
}) {
  return (
    <CITrainingLevelManagement
      programId={programId}
      programName={programName}
    />
  );
}

export function ProgramManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editProgramName, setEditProgramName] = useState("");
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [selectedProgramForTemplate, setSelectedProgramForTemplate] =
    useState<Program | null>(null);
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
  /** Bumps when streams/transitions change so level ladder refetches */
  const [catalogTick, setCatalogTick] = useState(0);
  const [kitCounts, setKitCounts] = useState<Record<number, number>>({});
  const [openLevelModes, setOpenLevelModes] = useState<
    Record<number, "basic" | "ci-training" | "kit-items" | "certificate">
  >({});
  /** Currently active program tab (the program shown in the outer tabs row). */
  const [activeProgramId, setActiveProgramId] = useState<string>("");
  /** Certificate editor — selected field key in the right-side fields list. */
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pdfScale, setPdfScale] = useState({
    width: 612,
    height: 792,
    scale: 1,
  }); // Default PDF dimensions (8.5" x 11" at 72 DPI)
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { programs, isLoading } = usePrograms();

  useEffect(() => {
    setOpenLevelModes((prev) =>
      Object.fromEntries(
        programs.map((program) => [program.id, prev[program.id] ?? "basic"]),
      ),
    );
    // Keep activeProgramId in sync: pick the first program when none selected,
    // or reset if the active one was deleted.
    if (programs.length === 0) {
      if (activeProgramId !== "") setActiveProgramId("");
      return;
    }
    const stillExists = programs.some(
      (p) => String(p.id) === activeProgramId,
    );
    if (!stillExists) {
      setActiveProgramId(String(programs[0].id));
    }
  }, [programs, activeProgramId]);

  // Load the certificate template whenever the user switches to the Certificate
  // tab for the active program. We only load once per (program, tab) combo to
  // avoid hammering the API.
  const certLoadedForRef = useRef<number | null>(null);
  useEffect(() => {
    if (!activeProgramId) return;
    const activeProgram = programs.find(
      (p) => String(p.id) === activeProgramId,
    );
    if (!activeProgram) return;
    const mode = openLevelModes[activeProgram.id];
    if (mode !== "certificate") return;
    if (certLoadedForRef.current === activeProgram.id) return;
    certLoadedForRef.current = activeProgram.id;
    void loadCertificateTemplate(activeProgram);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProgramId, openLevelModes, programs]);

  const handleAddProgram = async () => {
    if (!newProgramName.trim()) {
      toast.error("Program name cannot be empty");
      return;
    }

    try {
      await createProgram(newProgramName.trim());
      toast.success("Program created successfully");
      setNewProgramName("");
      setIsAddDialogOpen(false);
      void invalidatePrograms();
    } catch (error) {
      toast.error("Failed to create program");
    }
  };

  const handleEditProgram = async () => {
    if (!editingProgram || !editProgramName.trim()) {
      toast.error("Program name cannot be empty");
      return;
    }

    try {
      await updateProgram(editingProgram.id, editProgramName.trim());
      toast.success("Program updated successfully");
      setIsEditDialogOpen(false);
      setEditingProgram(null);
      setEditProgramName("");
      void invalidatePrograms();
    } catch (error) {
      toast.error("Failed to update program");
    }
  };

  const handleDeleteProgram = async () => {
    if (!deletingProgram) return;

    try {
      await deleteProgram(deletingProgram.id);
      toast.success("Program deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingProgram(null);
      void invalidatePrograms();
    } catch (error) {
      toast.error("Failed to delete program. It may have associated levels.");
    }
  };

  const loadCertificateTemplate = async (program: Program) => {
    setSelectedProgramForTemplate(program);
    setIsLoadingTemplate(true);
    setIsEditMode(false);

    try {
      const template = await getCertificateTemplate(program.id);
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

        // Load field coordinates
        if (template.fieldCoordinates) {
          setFieldCoordinates(template.fieldCoordinates);
        } else {
          // Use default coordinates if none exist
          setFieldCoordinates({
            student_name: { rect: [255, 338, 598, 354], label: "Student Name" },
            student_level: {
              rect: [184, 299, 359, 315],
              label: "Student Level",
            },
            student_program: {
              rect: [383, 298, 596, 314],
              label: "Student Program",
            },
            franchise_name: {
              rect: [177, 223, 635, 239],
              label: "Franchise Name",
            },
            year: { rect: [76, 100, 147, 116], label: "Year" },
            franchisee: { rect: [431, 98, 539, 114], label: "Franchisee" },
          });
        }

        if (template.templatePdfPath) {
          const baseUrl = getApiBaseUrl();
          setTemplatePreviewUrl(
            `${baseUrl}/uploads/${template.templatePdfPath}?t=${Date.now()}`,
          );
          setTemplateImageUrl(null); // Reset to trigger fresh load
        }
      } else {
        // Reset to defaults
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
        setFieldCoordinates({
          student_name: { rect: [255, 338, 598, 354], label: "Student Name" },
          student_level: { rect: [184, 299, 359, 315], label: "Student Level" },
          student_program: {
            rect: [383, 298, 596, 314],
            label: "Student Program",
          },
          franchise_name: {
            rect: [177, 223, 635, 239],
            label: "Franchise Name",
          },
          year: { rect: [76, 100, 147, 116], label: "Year" },
          franchisee: { rect: [431, 98, 539, 114], label: "Franchisee" },
        });
      }
    } catch (error) {
      toast.error("Failed to load certificate template");
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedProgramForTemplate) return;

    setIsSavingTemplate(true);
    try {
      const certificateTitle =
        typeof templateData.certificateTitle === "string" &&
        templateData.certificateTitle.trim()
          ? templateData.certificateTitle
          : "Certificate of Completion";
      const issuerName =
        typeof templateData.issuerName === "string" && templateData.issuerName.trim()
          ? templateData.issuerName
          : "Ideal Play Abacus";
      const additionalText =
        typeof templateData.additionalText === "string" && templateData.additionalText.trim()
          ? templateData.additionalText
          : undefined;
      const isActive =
        typeof templateData.isActive === "boolean" ? templateData.isActive : true;

      const templatePayload = {
        certificateTitle,
        issuerName,
        additionalText,
        fieldCoordinates: fieldCoordinates || undefined,
        isActive,
      };

      if (templateFile) {
        // Combined atomic upload + save
        await uploadCertificateTemplate(
          selectedProgramForTemplate.id,
          templateFile,
          templatePayload,
        );
      } else {
        // Metadata-only update (no new file)
        await updateCertificateTemplate(selectedProgramForTemplate.id, {
          id: templateId,
          ...templatePayload,
        });
      }

      toast.success("Certificate template saved successfully");

      setIsEditMode(false);

      // Reload template to get final updated data
      const updatedTemplate = await getCertificateTemplate(
        selectedProgramForTemplate.id,
      );
      if (updatedTemplate?.id) setTemplateId(updatedTemplate.id);
      if (updatedTemplate?.templatePdfPath) {
        const baseUrl = getApiBaseUrl();
        const newUrl = `${baseUrl}/uploads/${
          updatedTemplate.templatePdfPath
        }?t=${Date.now()}`;
        setTemplatePreviewUrl(newUrl);
        setTemplateImageUrl(null); // Reset image to trigger reload
      }
      if (updatedTemplate?.fieldCoordinates) {
        setFieldCoordinates(updatedTemplate.fieldCoordinates);
      }
    } catch (error: any) {
      toast.error(getUserFriendlyMessage(error, "Failed to save certificate template"));
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
      setTemplateImageUrl(null); // Reset image while loading
      // Reset coordinates when new file is uploaded
      setFieldCoordinates({
        student_name: { rect: [255, 338, 598, 354], label: "Student Name" },
        student_level: { rect: [184, 299, 359, 315], label: "Student Level" },
        student_program: {
          rect: [383, 298, 596, 314],
          label: "Student Program",
        },
        franchise_name: { rect: [177, 223, 635, 239], label: "Franchise Name" },
        year: { rect: [76, 100, 147, 116], label: "Year" },
        franchisee: { rect: [431, 98, 539, 114], label: "Franchisee" },
      });
    }
  };

  // Convert PDF coordinates to screen coordinates
  // PDF uses bottom-left origin, screen uses top-left origin
  const pdfToScreen = (pdfCoord: number, isY: boolean = false) => {
    const container = pdfContainerRef.current;
    if (!container || !templateImageUrl) return pdfCoord;

    const img = container.querySelector("img");
    if (!img) return pdfCoord;

    // Get actual image dimensions
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // PDF coordinates are in points (72 DPI), viewport is scaled
    // We need to scale from PDF points to rendered image pixels
    const pdfWidth = pdfScale.width;
    const pdfHeight = pdfScale.height;

    // Calculate scale based on actual image display size
    const scaleX = imgRect.width / pdfWidth;
    const scaleY = imgRect.height / pdfHeight;

    if (isY) {
      // Flip Y coordinate: PDF Y=0 is at bottom, screen Y=0 is at top
      return (pdfHeight - pdfCoord) * scaleY;
    }
    return pdfCoord * scaleX;
  };

  // Convert screen coordinates to PDF coordinates
  // PDF uses bottom-left origin, screen uses top-left origin
  const screenToPdf = (screenCoord: number, isY: boolean = false) => {
    const container = pdfContainerRef.current;
    if (!container || !templateImageUrl) return screenCoord;

    const img = container.querySelector("img");
    if (!img) return screenCoord;

    // Get actual image dimensions
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // PDF coordinates are in points (72 DPI), viewport is scaled
    const pdfWidth = pdfScale.width;
    const pdfHeight = pdfScale.height;

    // Calculate scale based on actual image display size
    const scaleX = imgRect.width / pdfWidth;
    const scaleY = imgRect.height / pdfHeight;

    if (isY) {
      // Flip Y coordinate: screen Y=0 is at top, PDF Y=0 is at bottom
      return pdfHeight - screenCoord / scaleY;
    }
    return screenCoord / scaleX;
  };

  // Handle dragging coordinate boxes
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

    // Get initial mouse position relative to container
    const startX = e.clientX - containerRect.left;
    const startY = e.clientY - containerRect.top;

    // Get initial box position in screen coordinates
    const startBoxX = pdfToScreen(rect[0], false);
    const startBoxY = pdfToScreen(rect[1], true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const containerRect = container.getBoundingClientRect();
      const currentX = moveEvent.clientX - containerRect.left;
      const currentY = moveEvent.clientY - containerRect.top;

      // Calculate delta
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // New box position in screen coordinates
      const newBoxX = startBoxX + deltaX;
      const newBoxY = startBoxY + deltaY;

      // Convert back to PDF coordinates and clamp to bounds
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

  // Convert PDF to image and update scale
  useEffect(() => {
    const loadPdfAsImage = async () => {
      if (
        !templatePreviewUrl ||
        !canvasRef.current ||
        typeof window === "undefined"
      )
        return;

      try {
        // Load PDF.js from CDN
        let pdfjsLib = window.pdfjsLib;

        if (!pdfjsLib) {
          // Load PDF.js script if not already loaded
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

        // Load PDF with proper CORS settings
        const loadingTask = pdfjsLib.getDocument({
          url: templatePreviewUrl,
          withCredentials: false,
          isEvalSupported: false,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Get original page size (in points, 72 DPI)
        const { width: pdfWidth, height: pdfHeight } = page.getViewport({
          scale: 1.0,
        });

        // Get viewport - use scale 2.0 for better quality rendering
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Convert canvas to image URL
        const imageUrl = canvas.toDataURL("image/png");
        setTemplateImageUrl(imageUrl);

        // Store original PDF dimensions (in points) for coordinate conversion
        // The coordinates stored in database are in PDF points (72 DPI)
        setPdfScale({
          width: pdfWidth,
          height: pdfHeight,
          scale: 2.0, // Rendering scale
        });
      } catch (error) {
        sendClientLog({ level: "error", event: "pdf-load-error", message: "Error loading PDF preview", context: { error } });
        toast.error("Failed to load PDF preview");
      }
    };

    loadPdfAsImage();
  }, [templatePreviewUrl]);

  // Update scale when window resizes
  useEffect(() => {
    const handleResize = () => {
      // Force re-render of coordinate overlays by updating state
      // The pdfToScreen function will recalculate based on current image size
      if (templateImageUrl && pdfContainerRef.current) {
        // Trigger a state update to force re-render
        setPdfScale((prev) => ({ ...prev }));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [templateImageUrl]);

  return (
    <>
      {programs.length === 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card px-4 py-4 shadow-sm sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl text-card-foreground">Programs</h1>
                <p className="text-sm text-muted-foreground">
                  Configure program structure, streams, and kit defaults.
                </p>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Program
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            {isLoading
              ? "Loading programs…"
              : "No programs yet. Create your first program to get started."}
          </div>
        </div>
      ) : (
        <PageTabs
          title="Programs"
          description="Configure program structure, streams, and kit defaults."
          action={
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Program
            </Button>
          }
          tabs={programs.map((program) => ({
            value: String(program.id),
            label: program.name,
          }))}
          value={activeProgramId || String(programs[0].id)}
          onValueChange={setActiveProgramId}
        >
          {programs.map((program) => (
            <PageTabsContent
              key={program.id}
              value={String(program.id)}
              className="mt-0 space-y-4"
            >
              <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                <Tabs
                  value={openLevelModes[program.id] ?? "basic"}
                  onValueChange={(value) =>
                    setOpenLevelModes((prev) => ({
                      ...prev,
                      [program.id]: value as
                        | "basic"
                        | "ci-training"
                        | "kit-items"
                        | "certificate",
                    }))
                  }
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <TabsList className="flex h-auto flex-wrap gap-1">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="ci-training">CI Training</TabsTrigger>
                      <TabsTrigger value="kit-items">Kit Items</TabsTrigger>
                      <TabsTrigger value="certificate">Certificate</TabsTrigger>
                    </TabsList>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-md p-0"
                        onClick={() => {
                          setEditingProgram(program);
                          setEditProgramName(program.name);
                          setIsEditDialogOpen(true);
                        }}
                        title="Rename program"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-md p-0"
                        onClick={() => {
                          setDeletingProgram(program);
                          setIsDeleteDialogOpen(true);
                        }}
                        title="Delete program"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <TabsContent value="basic">
                    <BasicProgramCatalogPanel
                      programId={program.id}
                      programName={program.name}
                      catalogVersion={catalogTick}
                      onCatalogChange={() => setCatalogTick((t) => t + 1)}
                    />
                  </TabsContent>
                  <TabsContent value="ci-training">
                    <CITrainingCatalogPanel
                      programId={program.id}
                      programName={program.name}
                    />
                  </TabsContent>
                  <TabsContent value="kit-items">
                    <ProgramKitManagement
                      programId={program.id}
                      programName={program.name}
                      onCountChange={(count) =>
                        setKitCounts((prev) =>
                          prev[program.id] === count
                            ? prev
                            : { ...prev, [program.id]: count },
                        )
                      }
                    />
                  </TabsContent>
                  <TabsContent value="certificate">
                    {selectedProgramForTemplate?.id !== program.id ? (
                      <div className="rounded-lg border border-dashed bg-card px-6 py-8 text-center text-sm text-muted-foreground">
                        Open this tab to load the certificate template…
                      </div>
                    ) : isLoadingTemplate ? (
                      <div className="rounded-lg border border-dashed bg-card px-6 py-8 text-center text-sm text-muted-foreground">
                        Loading template…
                      </div>
                    ) : (
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
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </PageTabsContent>
          ))}
        </PageTabs>
      )}

      {/* Add Program Dialog */}
      <FormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        size="sm"
        title="Add New Program"
        description="Create a new program. You can add levels and inventory to it later."
        headerIcon={Plus}
        onSubmit={(e) => {
          e.preventDefault();
          handleAddProgram();
        }}
        submitLabel="Create Program"
      >
        <DialogFormField id="programName" label="Program Name" required>
          <Input
            id="programName"
            placeholder="e.g., Reading Literacy"
            value={newProgramName}
            onChange={(e) => setNewProgramName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddProgram()}
          />
        </DialogFormField>
      </FormDialog>

      {/* Edit Program Dialog */}
      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        size="sm"
        title="Edit Program"
        description="Update the program name."
        headerIcon={Edit2}
        onSubmit={(e) => {
          e.preventDefault();
          handleEditProgram();
        }}
        submitLabel="Save Changes"
      >
        <DialogFormField id="editProgramName" label="Program Name" required>
          <Input
            id="editProgramName"
            value={editProgramName}
            onChange={(e) => setEditProgramName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEditProgram()}
          />
        </DialogFormField>
      </FormDialog>

      {/* Delete Program Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        variant="destructive"
        title="Delete program?"
        description={`This will permanently delete the program "${deletingProgram?.name}". This action cannot be undone and will also delete all associated levels and inventory.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteProgram}
      />

    </>
  );
}
