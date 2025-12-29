"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Package,
  FileText,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  getAllPrograms,
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
import { AdminTable } from "@/components/shared";
import type { AdminTableColumn } from "@/components/shared/AdminTable";
import { LevelManagement } from "./LevelManagement";
import { StreamManagement } from "./StreamManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getProgramKits,
  createProgramKit,
  deleteProgramKit,
  type ProgramKit,
} from "@/services/starting-kit.service";
import { createInventory } from "@/services/inventory.service";
import {
  getInventoryCategories,
  type InventoryCategory,
} from "@/services/inventory-category.service";
import { CategorySelect } from "@/components/inventory/CategorySelect";

export function ProgramManagement() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editProgramName, setEditProgramName] = useState("");
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isKitDialogOpen, setIsKitDialogOpen] = useState(false);
  const [selectedProgramForKit, setSelectedProgramForKit] =
    useState<Program | null>(null);
  const [kitItems, setKitItems] = useState<ProgramKit[]>([]);
  const [isLoadingKits, setIsLoadingKits] = useState(false);
  const [newKitQuantity, setNewKitQuantity] = useState<number>(1);
  const [isCreatingInventory, setIsCreatingInventory] = useState(false);
  const [newInventoryName, setNewInventoryName] = useState("");
  const [newInventoryDescription, setNewInventoryDescription] = useState("");
  const [newInventoryCategory, setNewInventoryCategory] = useState<string>("");
  const [newInventoryQuantity, setNewInventoryQuantity] = useState<number>(0);
  const [newInventoryRestockQuantity, setNewInventoryRestockQuantity] =
    useState<number>(0);
  const [inventoryCategories, setInventoryCategories] = useState<
    InventoryCategory[]
  >([]);
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
    null
  );
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [fieldCoordinates, setFieldCoordinates] = useState<Record<
    string,
    FieldCoordinate
  > | null>(null);
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

  useEffect(() => {
    loadPrograms();
    loadInventoryCategories();
  }, []);

  const loadPrograms = async () => {
    try {
      const data = await getAllPrograms();
      setPrograms(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load programs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadInventoryCategories = async () => {
    try {
      const data = await getInventoryCategories();
      setInventoryCategories(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inventory categories",
        variant: "destructive",
      });
    }
  };

  const handleCategoryAdded = async (newCategory: InventoryCategory) => {
    // Reload categories to include the new one
    await loadInventoryCategories();
  };

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
      loadPrograms();
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
      loadPrograms();
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
      loadPrograms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete program. It may have associated levels.",
        variant: "destructive",
      });
    }
  };

  const handleViewStartingKit = async (program: Program) => {
    setSelectedProgramForKit(program);
    setIsKitDialogOpen(true);
    setIsLoadingKits(true);

    try {
      // Load kit items for this program
      const kits = await getProgramKits(program.id);
      setKitItems(kits);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load starting kit items",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKits(false);
    }
  };

  const handleCreateAndAddKitItem = async () => {
    if (!selectedProgramForKit) return;

    if (
      !newInventoryName.trim() ||
      !newInventoryCategory ||
      newKitQuantity < 1
    ) {
      toast({
        title: "Error",
        description:
          "Please fill in all required fields (name, category, quantity)",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingInventory(true);

    try {
      const newInventory = await createInventory({
        name: newInventoryName.trim(),
        description: newInventoryDescription.trim() || "",
        categoryId: Number(newInventoryCategory),
        quantity: newInventoryQuantity || 0,
        restockQuantity: newInventoryRestockQuantity || 0,
        programId: selectedProgramForKit.id,
        isActive: true,
      });

      await createProgramKit(selectedProgramForKit.id, {
        inventoryId: newInventory.id,
        defaultQuantity: newKitQuantity,
      });

      toast({
        title: "Success",
        description: "Kit item created and added successfully",
      });

      const kits = await getProgramKits(selectedProgramForKit.id);
      setKitItems(kits);

      // Reset form
      setNewInventoryName("");
      setNewInventoryDescription("");
      setNewInventoryCategory("");
      setNewInventoryQuantity(0);
      setNewInventoryRestockQuantity(0);
      setNewKitQuantity(1);
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to create kit item",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInventory(false);
    }
  };

  const handleDeleteKitItem = async (kitId: number) => {
    try {
      await deleteProgramKit(kitId);
      toast({
        title: "Success",
        description: "Kit item removed successfully",
      });

      // Reload kit items
      if (selectedProgramForKit) {
        const kits = await getProgramKits(selectedProgramForKit.id);
        setKitItems(kits);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove kit item",
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
          const baseUrl = "http://localhost:5000";
          setTemplatePreviewUrl(
            `${baseUrl}/uploads/${template.templatePdfPath}?t=${Date.now()}`
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
      // Upload file first if selected
      if (templateFile) {
        const uploadedTemplate = await uploadCertificateTemplate(
          selectedProgramForTemplate.id,
          templateFile
        );

        // Immediately reload the template to get the coordinates from backend
        if (uploadedTemplate) {
          const freshTemplate = await getCertificateTemplate(
            selectedProgramForTemplate.id
          );

          if (freshTemplate?.fieldCoordinates) {
            setFieldCoordinates(freshTemplate.fieldCoordinates);
          }

          if (freshTemplate?.templatePdfPath) {
            const baseUrl = "http://localhost:5000";
            const newUrl = `${baseUrl}/uploads/${
              freshTemplate.templatePdfPath
            }?t=${Date.now()}`;
            setTemplatePreviewUrl(newUrl);
            setTemplateImageUrl(null); // Reset image to trigger reload
          }
        }
      }

      // Update template data including fieldCoordinates
      // Use existing templateData values or defaults
      await updateCertificateTemplate(selectedProgramForTemplate.id, {
        certificateTitle:
          templateData.certificateTitle || "Certificate of Completion",
        issuerName: templateData.issuerName || "Ideal Play Abacus",
        signatureField1Label: templateData.signatureField1Label || undefined,
        signatureField1Name: templateData.signatureField1Name || undefined,
        signatureField2Label: templateData.signatureField2Label || undefined,
        signatureField2Name: templateData.signatureField2Name || undefined,
        additionalText: templateData.additionalText || undefined,
        fieldCoordinates: fieldCoordinates || undefined,
        isActive: templateData.isActive ?? true,
      });

      toast({
        title: "Success",
        description: "Certificate template saved successfully",
      });

      setIsEditMode(false);

      // Reload template to get final updated data
      const updatedTemplate = await getCertificateTemplate(
        selectedProgramForTemplate.id
      );
      if (updatedTemplate?.templatePdfPath) {
        const baseUrl = "http://localhost:5000";
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
    e: React.ChangeEvent<HTMLInputElement>
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
    const width = field.rect[2] - field.rect[0];
    const height = field.rect[3] - field.rect[1];

    // Get initial mouse position relative to container
    const startX = e.clientX - containerRect.left;
    const startY = e.clientY - containerRect.top;

    // Get initial box position in screen coordinates
    const startBoxX = pdfToScreen(field.rect[0], false);
    const startBoxY = pdfToScreen(field.rect[1], true);

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
        Math.min(screenToPdf(newBoxX, false), pdfScale.width - width)
      );
      const newPdfY1 = Math.max(
        0,
        Math.min(screenToPdf(newBoxY, true), pdfScale.height - height)
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
    currentPage * itemsPerPage
  );

  const columns: AdminTableColumn<Program>[] = [
    {
      key: "program",
      header: "Program",
      className: "w-[300px]",
    },
    {
      key: "id",
      header: "Program ID",
      className: "text-center",
      render: (program) => <Badge variant="outline">ID: {program.id}</Badge>,
    },
    {
      key: "createdDate",
      header: "Created Date",
      className: "text-center",
      render: (program) =>
        program.createdAt
          ? new Date(program.createdAt).toLocaleDateString()
          : "N/A",
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (program) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewStartingKit(program);
            }}
            title="View Starting Kit"
          >
            <Package className="w-4 h-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
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
            onClick={(e) => {
              e.stopPropagation();
              setEditingProgram(program);
              setEditProgramName(program.name);
              setIsEditDialogOpen(true);
            }}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingProgram(program);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg border">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Programs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure programs and their hierarchical structure
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Program
        </Button>
      </div>

      <AdminTable
        data={paginatedPrograms}
        loading={isLoading}
        columns={columns}
        getRowId={(program) => program.id.toString()}
        renderMainCell={(program) => (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">{program.name}</div>
            <div className="text-sm text-gray-500">
              Program configuration and level management
            </div>
          </div>
        )}
        renderExpandedContent={(program) => (
          <div className="bg-gray-50 p-6 border-t">
            <Tabs defaultValue="streams" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="streams">Streams</TabsTrigger>
                <TabsTrigger value="levels">Levels</TabsTrigger>
              </TabsList>
              <TabsContent value="streams" className="mt-4">
                <StreamManagement
                  programId={program.id}
                  programName={program.name}
                />
              </TabsContent>
              <TabsContent value="levels" className="mt-4">
                <LevelManagement
                  programId={program.id}
                  programName={program.name}
                />
              </TabsContent>
            </Tabs>
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
              This will permanently delete the program "{deletingProgram?.name}
              ". This action cannot be undone and will also delete all
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

      {/* Starting Kit Dialog */}
      <Dialog open={isKitDialogOpen} onOpenChange={setIsKitDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Starting Kit - {selectedProgramForKit?.name}
            </DialogTitle>
            <DialogDescription>
              Manage starting kit items for this program. These items will be
              available for selection during franchise approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Existing Kit Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Current Kit Items</h3>
              {isLoadingKits ? (
                <div className="text-center py-8 text-gray-500">
                  Loading kit items...
                </div>
              ) : kitItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                  No kit items configured yet. Add items below.
                </div>
              ) : (
                <div className="space-y-2">
                  {kitItems.map((kit) => (
                    <div
                      key={kit.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {kit.inventory?.name || `Item #${kit.inventoryId}`}
                        </p>
                        {kit.inventory?.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {kit.inventory.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-gray-600">
                            Category: {kit.inventory?.category?.name || "N/A"}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            Default Quantity: {kit.defaultQuantity}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKitItem(kit.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create New Kit Item */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">
                Create New Kit Item
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inventoryName">
                      Item Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="inventoryName"
                      placeholder="e.g., Starter Kit Box"
                      value={newInventoryName}
                      onChange={(e) => setNewInventoryName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventoryCategory">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <CategorySelect
                      value={newInventoryCategory}
                      onValueChange={setNewInventoryCategory}
                      categories={inventoryCategories}
                      onCategoryAdded={handleCategoryAdded}
                      placeholder="Select category"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inventoryDescription">Description</Label>
                  <Input
                    id="inventoryDescription"
                    placeholder="Brief description of the item"
                    value={newInventoryDescription}
                    onChange={(e) => setNewInventoryDescription(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inventoryQuantity">Stock Quantity</Label>
                    <Input
                      id="inventoryQuantity"
                      type="number"
                      min="0"
                      value={newInventoryQuantity}
                      onChange={(e) =>
                        setNewInventoryQuantity(Number(e.target.value) || 0)
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventoryRestockQuantity">
                      Restock Quantity
                    </Label>
                    <Input
                      id="inventoryRestockQuantity"
                      type="number"
                      min="0"
                      value={newInventoryRestockQuantity}
                      onChange={(e) =>
                        setNewInventoryRestockQuantity(
                          Number(e.target.value) || 0
                        )
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kitQuantity">
                      Default Kit Quantity{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="kitQuantity"
                      type="number"
                      min="1"
                      value={newKitQuantity}
                      onChange={(e) =>
                        setNewKitQuantity(Number(e.target.value) || 1)
                      }
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={handleCreateAndAddKitItem}
                    disabled={
                      isCreatingInventory ||
                      !newInventoryName.trim() ||
                      !newInventoryCategory ||
                      newKitQuantity < 1
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isCreatingInventory ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create & Add to Kit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsKitDialogOpen(false);
                setSelectedProgramForKit(null);
                setKitItems([]);
                setNewInventoryName("");
                setNewInventoryDescription("");
                setNewInventoryCategory("");
                setNewInventoryQuantity(0);
                setNewInventoryRestockQuantity(0);
                setNewKitQuantity(1);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      Click "Edit Coordinates" to adjust field positions.
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
                                const x1 = pdfToScreen(coord.rect[0], false);
                                const y1 = pdfToScreen(coord.rect[1], true);
                                const x2 = pdfToScreen(coord.rect[2], false);
                                const y2 = pdfToScreen(coord.rect[3], true);
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
                              }
                            )}
                          </div>
                        )}
                      </div>
                      {isEditMode && (
                        <p className="text-sm text-blue-600 mt-2">
                          💡 Drag the blue boxes to reposition field
                          coordinates. Click "Save Template" to save changes.
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
