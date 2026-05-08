"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, FileText, Edit, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/shared";
import type { DataTableColumn } from "@/components/shared";
import { LevelManagement } from "./LevelManagement";
import { CITrainingLevelManagement } from "./CITrainingLevelManagement";
import { ProgramKitManagement } from "./ProgramKitManagement";
import { StreamManagement } from "./StreamManagement";
import { getApiBaseUrl } from "@/lib/api-utils";
import type { Stream } from "@/services/stream.service";
import type { StreamTransition } from "@/services/stream-transition.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStreamsByProgram } from "@/hooks/api/stream.hooks";
import { useStreamTransitionsByProgram } from "@/hooks/api/stream-transition.hooks";
import { usePrograms, invalidatePrograms } from "@/hooks/api/program.hooks";

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
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <StreamManagement
              programId={programId}
              programName={programName}
              compact
              initialStreams={streams}
              initialTransitions={transitions}
              skipInitialLoad
              onCatalogChange={onCatalogChange}
            />
          </div>
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
  const [currentPage, setCurrentPage] = useState(1);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
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
    Record<number, "basic" | "ci-training" | "kit-items">
  >({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [pdfScale, setPdfScale] = useState({
    width: 612,
    height: 792,
    scale: 1,
  }); // Default PDF dimensions (8.5" x 11" at 72 DPI)
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const itemsPerPage = 10;

  const { programs, isLoading } = usePrograms();

  useEffect(() => {
    setOpenLevelModes((prev) =>
      Object.fromEntries(
        programs.map((program) => [program.id, prev[program.id] ?? "basic"]),
      ),
    );
  }, [programs]);

  const handleAddProgram = async () => {
    if (!newProgramName.trim()) {
      toast({
        title: "Error",
        description: "Program name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await createProgram(newProgramName.trim());
      toast({
        title: "Success",
        description: "Program created successfully",
      });
      setNewProgramName("");
      setIsAddDialogOpen(false);
      void invalidatePrograms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create program",
        variant: "destructive",
      });
    }
  };

  const handleEditProgram = async () => {
    if (!editingProgram || !editProgramName.trim()) {
      toast({
        title: "Error",
        description: "Program name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProgram(editingProgram.id, editProgramName.trim());
      toast({
        title: "Success",
        description: "Program updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingProgram(null);
      setEditProgramName("");
      void invalidatePrograms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update program",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProgram = async () => {
    if (!deletingProgram) return;

    try {
      await deleteProgram(deletingProgram.id);
      toast({
        title: "Success",
        description: "Program deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeletingProgram(null);
      void invalidatePrograms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete program. It may have associated levels.",
        variant: "destructive",
      });
    }
  };

  const handleViewCertificateTemplate = async (program: Program) => {
    setSelectedProgramForTemplate(program);
    setIsTemplateDialogOpen(true);
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
      toast({
        title: "Error",
        description: "Failed to load certificate template",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedProgramForTemplate) return;

    setIsSavingTemplate(true);
    try {
      const templatePayload = {
        certificateTitle:
          templateData.certificateTitle || "Certificate of Completion",
        issuerName: templateData.issuerName || "Ideal Play Abacus",
        additionalText: templateData.additionalText || undefined,
        fieldCoordinates: fieldCoordinates || undefined,
        isActive: templateData.isActive ?? true,
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

      toast({
        title: "Success",
        description: "Certificate template saved successfully",
      });

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
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "Failed to save certificate template",
        variant: "destructive",
      });
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
        toast({
          title: "Error",
          description: "Only PDF files are allowed",
          variant: "destructive",
        });
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
        let pdfjsLib = (window as any).pdfjsLib;

        if (!pdfjsLib) {
          // Load PDF.js script if not already loaded
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => {
              pdfjsLib = (window as any).pdfjsLib || (window as any).pdfjs;
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
        console.error("Error loading PDF:", error);
        toast({
          title: "Error",
          description: "Failed to load PDF preview",
          variant: "destructive",
        });
      }
    };

    loadPdfAsImage();
  }, [templatePreviewUrl, toast]);

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

  const totalPages = Math.ceil(programs.length / itemsPerPage);
  const paginatedPrograms = programs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const columns: DataTableColumn<Program>[] = [
    {
      key: "program",
      header: "Program",
      className: "w-[360px] !h-10 !px-4 !py-2",
    },
    {
      key: "id",
      header: "Program ID",
      className: "text-center !h-10 !px-4 !py-2",
      render: (program) => <Badge variant="outline">ID: {program.id}</Badge>,
    },
    {
      key: "createdDate",
      header: "Created Date",
      className: "text-center !h-10 !px-4 !py-2",
      render: (program) =>
        program.createdAt
          ? new Date(program.createdAt).toLocaleDateString()
          : "N/A",
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center !h-10 !px-4 !py-2",
      render: (program) => (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-md p-0 hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              handleViewCertificateTemplate(program);
            }}
            title="Certificate Template"
          >
            <FileText className="w-4 h-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-md p-0 hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              setEditingProgram(program);
              setEditProgramName(program.name);
              setIsEditDialogOpen(true);
            }}
            title="Edit program"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-md p-0 hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingProgram(program);
              setIsDeleteDialogOpen(true);
            }}
            title="Delete program"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl text-card-foreground">Programs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure program structure, streams, and kit defaults
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Program
          </Button>
        </div>
      </div>

      <DataTable
        data={paginatedPrograms}
        loading={isLoading}
        columns={columns}
        getRowId={(program) => program.id.toString()}
        renderMainCell={(program) => (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-gray-900">{program.name}</div>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                Kit items: {kitCounts[program.id] ?? 0}
              </Badge>
            </div>
            <div className="text-sm text-gray-500">Levels and streams</div>
          </div>
        )}
        renderExpandedContent={(program) => (
          <div className="border-t bg-gray-50 px-4 py-4 sm:px-5">
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <Tabs
                  value={openLevelModes[program.id] ?? "basic"}
                  onValueChange={(value) =>
                    setOpenLevelModes((prev) => ({
                      ...prev,
                      [program.id]: value as
                        | "basic"
                        | "ci-training"
                        | "kit-items",
                    }))
                  }
                  className="space-y-4"
                >
                  <TabsList className="grid w-full max-w-[420px] grid-cols-3">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="ci-training">CI Training</TabsTrigger>
                    <TabsTrigger value="kit-items">Kit Items</TabsTrigger>
                  </TabsList>
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
                            : {
                                ...prev,
                                [program.id]: count,
                              },
                        )
                      }
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
        pagination={{ total: programs.length, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        emptyMessage="No programs found. Create your first program to get started."
        resultsText={(count, total) => `Showing ${count} of ${total} programs`}
      />

      {/* Add Program Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Program</DialogTitle>
            <DialogDescription>
              Create a new program. You can add levels and inventory to it
              later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="programName">Program Name</Label>
              <Input
                id="programName"
                placeholder="e.g., Reading Literacy"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddProgram()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddProgram}
              className="bg-primary hover:bg-brand-green-600"
            >
              Create Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>Update the program name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editProgramName">Program Name</Label>
              <Input
                id="editProgramName"
                value={editProgramName}
                onChange={(e) => setEditProgramName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditProgram()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditProgram}
              className="bg-primary hover:bg-brand-green-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Program Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the program &quot;
              {deletingProgram?.name}
              &quot;. This action cannot be undone and will also delete all
              associated levels and inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProgram}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Certificate Template Dialog */}
      <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Certificate Template - {selectedProgramForTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Upload a PDF template and configure field coordinates for
              certificate generation.
            </DialogDescription>
          </DialogHeader>

          {isLoadingTemplate ? (
            <div className="text-center py-8 text-gray-500">
              Loading template...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Template PDF Upload */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Template PDF</h3>
                  {templatePreviewUrl && fieldCoordinates && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={isEditMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsEditMode(!isEditMode)}
                      >
                        {isEditMode ? (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            View Mode
                          </>
                        ) : (
                          <>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Coordinates
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="templateFile">Upload Template PDF</Label>
                    <Input
                      id="templateFile"
                      type="file"
                      accept=".pdf"
                      onChange={handleTemplateFileChange}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Upload a PDF file to use as the certificate template.
                      Click &quot;Edit Coordinates&quot; to adjust field
                      positions.
                    </p>
                  </div>
                  {templatePreviewUrl && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <p className="text-sm font-medium mb-2">
                        Template Preview:
                      </p>
                      <div
                        ref={pdfContainerRef}
                        className="relative w-full border rounded bg-white overflow-hidden"
                        style={{ minHeight: "600px" }}
                      >
                        {/* Hidden canvas for PDF rendering */}
                        <canvas
                          ref={canvasRef}
                          className="hidden"
                          style={{ display: "none" }}
                        />
                        {/* Display image */}
                        {templateImageUrl ? (
                          <img
                            src={templateImageUrl}
                            alt="Template Preview"
                            className="w-full h-auto"
                            style={{ display: "block" }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[600px]">
                            <p className="text-gray-500">
                              Loading PDF preview...
                            </p>
                          </div>
                        )}
                        {isEditMode && fieldCoordinates && templateImageUrl && (
                          <div className="absolute inset-0 pointer-events-none">
                            {Object.entries(fieldCoordinates).map(
                              ([key, coord]) => {
                                const r = coord.rect;
                                if (!r || r.length < 4) return null;
                                const x1 = pdfToScreen(r[0], false);
                                const y1 = pdfToScreen(r[1], true);
                                const x2 = pdfToScreen(r[2], false);
                                const y2 = pdfToScreen(r[3], true);
                                const width = x2 - x1;
                                const height = y2 - y1;

                                return (
                                  <div
                                    key={key}
                                    className={`absolute border-2 ${
                                      isEditMode
                                        ? "border-blue-500 bg-blue-100/30 cursor-move pointer-events-auto"
                                        : "border-green-500 bg-green-100/20"
                                    }`}
                                    style={{
                                      left: `${x1}px`,
                                      top: `${y1}px`,
                                      width: `${width}px`,
                                      height: `${height}px`,
                                    }}
                                    onMouseDown={(e) =>
                                      isEditMode && handleDragStart(key, e)
                                    }
                                    title={coord.label}
                                  >
                                    <div
                                      className={`absolute -top-6 left-0 text-xs font-medium px-1 rounded ${
                                        isEditMode
                                          ? "bg-blue-500 text-white"
                                          : "bg-green-500 text-white"
                                      }`}
                                    >
                                      {coord.label}
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        )}
                      </div>
                      {isEditMode && (
                        <p className="text-sm text-blue-600 mt-2">
                          💡 Drag the blue boxes to reposition field
                          coordinates. Click &quot;Save Template&quot; to save
                          changes.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTemplateDialogOpen(false);
                setSelectedProgramForTemplate(null);
                setTemplateFile(null);
                setTemplatePreviewUrl(null);
                setTemplateImageUrl(null);
                setIsEditMode(false);
                setFieldCoordinates(null);
                setTemplateId(undefined);
                setTemplateData({
                  certificateTitle: "",
                  issuerName: "",
                  signatureField1Label: "",
                  signatureField1Name: "",
                  signatureField2Label: "",
                  signatureField2Name: "",
                  additionalText: "",
                  isActive: true,
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSavingTemplate ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                "Save Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
