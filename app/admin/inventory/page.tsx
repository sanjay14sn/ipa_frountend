"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Package, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminTable } from "@/components/shared";
import type { AdminTableColumn } from "@/components/shared/AdminTable";
import {
  getAllInventory,
  getPaginatedInventory,
  createInventory,
  updateInventory,
  updateStock,
  deleteInventory,
  type Inventory,
  type CreateInventoryDto,
  type UpdateInventoryDto,
  type PaginationMeta,
  InventoryCategory,
} from "@/services/inventory.service";
import { getAllPrograms, type Program } from "@/services/program.service";
import { getLevelsByProgram, type Level } from "@/services/level.service";
import { InventoryDialogs } from "./components/InventoryDialogs";

export default function InventoryPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [stockItem, setStockItem] = useState<Inventory | null>(null);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [deletingItem, setDeletingItem] = useState<Inventory | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");
  const [selectedLevelId, setSelectedLevelId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const itemsPerPage = 10;

  const [formData, setFormData] = useState<CreateInventoryDto>({
    name: "",
    description: "",
    category: InventoryCategory.OTHER,
    price: 0,
    quantity: 0,
    restockQuantity: 10,
    programId: 0,
    levelId: 0,
    isActive: true,
  });

  const [editFormData, setEditFormData] = useState<UpdateInventoryDto>({});

  useEffect(() => {
    loadPrograms();
  }, []);

  // Load inventory when filters or page changes
  useEffect(() => {
    loadInventory();
  }, [
    currentPage,
    searchTerm,
    selectedProgramId,
    selectedLevelId,
    selectedStatus,
  ]);

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
    }
  };

  const loadLevels = async (programId: number) => {
    try {
      const data = await getLevelsByProgram(programId);
      setLevels(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load levels",
        variant: "destructive",
      });
    }
  };

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const filters: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      if (selectedProgramId !== "all") {
        filters.programId = Number(selectedProgramId);
      }

      if (selectedLevelId !== "all") {
        filters.levelId = Number(selectedLevelId);
      }

      if (selectedStatus !== "all") {
        filters.status = selectedStatus;
      }

      const result = await getPaginatedInventory(filters);
      setInventory(result.data);
      setPaginationMeta(result.meta);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: InventoryCategory.OTHER,
      price: 0,
      quantity: 0,
      restockQuantity: 10,
      programId: 0,
      levelId: 0,
      isActive: true,
    });
  };

  const handleFilterChange = (key: string, value: string | string[]) => {
    if (typeof value === "string") {
      switch (key) {
        case "program":
          setSelectedProgramId(value);
          setSelectedLevelId("all"); // Reset level when program changes
          setCurrentPage(1); // Reset to first page
          break;
        case "level":
          setSelectedLevelId(value);
          setCurrentPage(1); // Reset to first page
          break;
        case "status":
          setSelectedStatus(value);
          setCurrentPage(1); // Reset to first page
          break;
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleAddItem = async () => {
    if (!formData.name.trim() || formData.price <= 0) {
      toast({
        title: "Error",
        description: "Name and valid price are required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.programId || !formData.levelId) {
      toast({
        title: "Error",
        description: "Please select a program and level",
        variant: "destructive",
      });
      return;
    }

    try {
      await createInventory(formData);
      toast({
        title: "Success",
        description: "Inventory item created successfully",
      });
      resetForm();
      setIsAddDialogOpen(false);
      loadInventory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create inventory item",
        variant: "destructive",
      });
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;

    try {
      await updateInventory(editingItem.id, editFormData);
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingItem(null);
      setEditFormData({});
      loadInventory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inventory item",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStock = async () => {
    if (!stockItem) return;

    try {
      await updateStock(stockItem.id, stockQuantity);
      toast({ title: "Success", description: "Stock updated successfully" });
      setIsStockDialogOpen(false);
      setStockItem(null);
      setStockQuantity(0);
      loadInventory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;

    try {
      await deleteInventory(deletingItem.id);
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      loadInventory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete inventory item",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: InventoryCategory) => {
    switch (category) {
      case InventoryCategory.SHIRT:
      case InventoryCategory.UNIFORM:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case InventoryCategory.BOOK:
        return "bg-green-100 text-green-800 border-green-200";
      case InventoryCategory.STATIONERY:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case InventoryCategory.MATERIAL:
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Load levels for the selected program
  useEffect(() => {
    if (selectedProgramId !== "all") {
      loadLevels(Number(selectedProgramId));
    } else {
      setLevels([]);
    }
  }, [selectedProgramId]);

  const columns: AdminTableColumn<Inventory>[] = [
    { key: "item", header: "Item", className: "w-[250px]" },
    {
      key: "category",
      header: "Category",
      className: "text-center",
      render: (item) => (
        <Badge className={`${getCategoryColor(item.category)} border`}>
          {item.category}
        </Badge>
      ),
    },
    {
      key: "program",
      header: "Program/Level",
      className: "text-center",
      render: (item) => {
        const programName = item.level?.program?.name || "N/A";
        const levelName = item.level?.name || "N/A";
        return (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-600">{programName}</span>
            <span className="text-xs text-gray-500">{levelName}</span>
          </div>
        );
      },
    },
    {
      key: "price",
      header: "Price",
      className: "text-center",
      render: (item) => <span>₹{item.price}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      className: "text-center",
      render: (item) => (
        <div className="flex flex-col items-center">
          <span className="font-medium">{item.quantity}</span>
          {item.quantity <= item.restockQuantity && (
            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs mt-1">
              Low Stock
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (item) => (
        <Badge
          className={
            item.isActive
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-gray-100 text-gray-600 border-gray-200"
          }
        >
          {item.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setStockItem(item);
              setStockQuantity(item.quantity);
              setIsStockDialogOpen(true);
            }}
            title="Update Stock"
          >
            <Package className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingItem(item);
              setEditFormData({
                name: item.name,
                description: item.description,
                category: item.category,
                price: item.price,
                quantity: item.quantity,
                restockQuantity: item.restockQuantity,
                isActive: item.isActive,
              });
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
              setDeletingItem(item);
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
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/profile")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Inventory Management
          </h1>
          <p className="text-sm text-gray-600">
            Manage inventory items across all programs and levels
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="bg-white rounded-lg">
        <AdminTable
          data={inventory}
          loading={isLoading}
          columns={columns}
          getRowId={(item) => item.id.toString()}
          renderMainCell={(item) => (
            <div className="flex flex-col">
              <div className="font-medium text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-500 truncate max-w-[200px]">
                {item.description || "No description"}
              </div>
            </div>
          )}
          searchPlaceholder="Search inventory by name..."
          onSearchChange={handleSearchChange}
          filters={[
            {
              key: "program",
              label: "Program",
              options: [
                { value: "all", label: "All Programs" },
                ...programs.map((p) => ({
                  value: p.id.toString(),
                  label: p.name,
                })),
              ],
              defaultValue: "all",
            },
            {
              key: "level",
              label: "Level",
              options: [
                { value: "all", label: "All Levels" },
                ...levels.map((l) => ({
                  value: l.id.toString(),
                  label: l.name,
                })),
              ],
              defaultValue: "all",
            },
            {
              key: "status",
              label: "Status",
              options: [
                { value: "all", label: "All Status" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ],
              defaultValue: "all",
            },
          ]}
          onFilterChange={handleFilterChange}
          pagination={{ total: paginationMeta.total, totalPages: paginationMeta.totalPages }}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          emptyMessage="No inventory items found. Create your first item to get started."
          resultsText={(count, total) => `Showing ${count} of ${total} items`}
        />
      </div>

      <InventoryDialogs
        isAddDialogOpen={isAddDialogOpen}
        setIsAddDialogOpen={setIsAddDialogOpen}
        formData={formData}
        setFormData={setFormData}
        programs={programs}
        levels={levels}
        onAddSubmit={handleAddItem}
        onLoadLevels={loadLevels}
        isEditDialogOpen={isEditDialogOpen}
        setIsEditDialogOpen={setIsEditDialogOpen}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        onEditSubmit={handleEditItem}
        isStockDialogOpen={isStockDialogOpen}
        setIsStockDialogOpen={setIsStockDialogOpen}
        stockItem={stockItem}
        stockQuantity={stockQuantity}
        setStockQuantity={setStockQuantity}
        onStockSubmit={handleUpdateStock}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        deletingItem={deletingItem}
        onDeleteSubmit={handleDeleteItem}
      />
    </div>
  );
}
