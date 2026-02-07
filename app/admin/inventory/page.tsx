"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Package, ArrowLeft, ShoppingCart, Users, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { AdminTable } from "@/components/shared";
import type { AdminTableColumn } from "@/components/shared/AdminTable";
import {
  getPaginatedInventory,
  createInventory,
  updateInventory,
  updateStock,
  deleteInventory,
  linkSupplierToInventory,
  unlinkSupplierFromInventory,
  getSuppliersForInventory,
  type Inventory,
  type CreateInventoryDto,
  type UpdateInventoryDto,
  type PaginationMeta,
  type InventorySupplier,
} from "@/services/inventory.service";
import { getAllPrograms, type Program } from "@/services/program.service";
import { getLevelsByProgram, type Level } from "@/services/level.service";
import { getAllSuppliers, createSupplier, type Supplier } from "@/services/supplier.service";
import { createSupplierOrder, getOrderHistoryForInventory, receiveSupplierOrder, type CreateSupplierOrderDto, type SupplierOrder } from "@/services/supplier-order.service";
import { getInventoryCategories, type InventoryCategory } from "@/services/inventory-category.service";
import { InventoryDialogs } from "./components/InventoryDialogs";

export default function InventoryPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
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
  const [isSupplierOrderDialogOpen, setIsSupplierOrderDialogOpen] = useState(false);
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);
  const [isManageSuppliersDialogOpen, setIsManageSuppliersDialogOpen] = useState(false);
  const [isOrderHistoryDialogOpen, setIsOrderHistoryDialogOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [stockItem, setStockItem] = useState<Inventory | null>(null);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [deletingItem, setDeletingItem] = useState<Inventory | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<Inventory | null>(null);
  const [inventorySuppliers, setInventorySuppliers] = useState<InventorySupplier[]>([]);
  const [itemSuppliers, setItemSuppliers] = useState<InventorySupplier[]>([]); // For restock dialog
  const [orderHistory, setOrderHistory] = useState<SupplierOrder[]>([]);
  const [formError, setFormError] = useState("");

  // Supplier order form
  const [supplierOrderForm, setSupplierOrderForm] = useState({
    supplierId: 0,
    inventoryId: 0,
    quantity: 1,
    unitPrice: 0,
  });

  // Add supplier form - changed to create new supplier
  const [addSupplierForm, setAddSupplierForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    costPrice: 0,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");
  const [selectedLevelId, setSelectedLevelId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const itemsPerPage = 10;

  const [formData, setFormData] = useState<CreateInventoryDto>({
    name: "",
    description: "",
    categoryId: 0,
    quantity: 0,
    restockQuantity: 10,
    programId: 0,
    levelId: 0,
    isActive: true,
    price: 0,
  });

  const [editFormData, setEditFormData] = useState<UpdateInventoryDto>({});

  useEffect(() => {
    loadPrograms();
    loadSuppliers();
    loadCategories();
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

  const loadSuppliers = async () => {
    try {
      const data = await getAllSuppliers();
      setSuppliers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load suppliers",
        variant: "destructive",
      });
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getInventoryCategories();
      setCategories(data);
      // Set default category if available
      if (data.length > 0 && formData.categoryId === 0) {
        setFormData(prev => ({ ...prev, categoryId: data[0].id }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const handleCategoryAdded = async (newCategory: InventoryCategory) => {
    // Reload categories to include the new one
    await loadCategories();
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

  const loadInventorySuppliers = async (inventoryId: number) => {
    try {
      const data = await getSuppliersForInventory(inventoryId);
      setInventorySuppliers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load suppliers for this item",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      categoryId: categories.length > 0 ? categories[0].id : 0,
      quantity: 0,
      restockQuantity: 10,
      programId: 0,
      levelId: 0,
      isActive: true,
      price: 0,
    });
  };

  const handleFilterChange = (key: string, value: string | string[]) => {
    if (typeof value === "string") {
      switch (key) {
        case "program":
          setSelectedProgramId(value);
          setSelectedLevelId("all");
          setCurrentPage(1);
          break;
        case "level":
          setSelectedLevelId(value);
          setCurrentPage(1);
          break;
        case "status":
          setSelectedStatus(value);
          setCurrentPage(1);
          break;
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleAddItem = async () => {
    setFormError("");
    
    if (!formData.name.trim()) {
      setFormError("Name is required");
      return;
    }

    if (!formData.programId || !formData.levelId) {
      setFormError("Please select a program and level");
      return;
    }

    try {
      await createInventory(formData);
      toast({
        title: "Success",
        description: "Inventory item created successfully",
      });
      resetForm();
      setFormError("");
      setIsAddDialogOpen(false);
      loadInventory();
    } catch (error) {
      const errorMessage = getUserFriendlyMessage(
        error,
        "Failed to create inventory item"
      );
      setFormError(errorMessage);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;
    setFormError("");

    try {
      await updateInventory(editingItem.id, editFormData);
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingItem(null);
      setEditFormData({});
      setFormError("");
      loadInventory();
    } catch (error) {
      const errorMessage = getUserFriendlyMessage(
        error,
        "Failed to update inventory item"
      );
      setFormError(errorMessage);
    }
  };

  const handleUpdateStock = async () => {
    if (!stockItem) return;
    setFormError("");

    try {
      await updateStock(stockItem.id, stockQuantity);
      toast({ title: "Success", description: "Stock updated successfully" });
      setIsStockDialogOpen(false);
      setStockItem(null);
      setStockQuantity(0);
      setFormError("");
      loadInventory();
    } catch (error) {
      const errorMessage = getUserFriendlyMessage(
        error,
        "Failed to update stock"
      );
      setFormError(errorMessage);
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

  const handlePlaceSupplierOrder = async () => {
    if (!supplierOrderForm.supplierId || !supplierOrderForm.inventoryId) {
      toast({
        title: "Error",
        description: "Please select a supplier and inventory item",
        variant: "destructive",
      });
      return;
    }

    if (supplierOrderForm.quantity <= 0) {
      toast({
        title: "Error",
        description: "Quantity must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderData: CreateSupplierOrderDto = {
        supplierId: supplierOrderForm.supplierId,
        items: [
          {
            inventoryId: supplierOrderForm.inventoryId,
            quantity: supplierOrderForm.quantity,
            unitPrice: supplierOrderForm.unitPrice,
          },
        ],
      };

      await createSupplierOrder(orderData);
      toast({
        title: "Success",
        description: "Supplier order placed successfully",
      });
      setIsSupplierOrderDialogOpen(false);
      setSupplierOrderForm({
        supplierId: 0,
        inventoryId: 0,
        quantity: 1,
        unitPrice: 0,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place supplier order",
        variant: "destructive",
      });
    }
  };

  const handleAddSupplier = async () => {
    if (!selectedInventoryItem) return;

    if (!addSupplierForm.name.trim()) {
      toast({
        title: "Error",
        description: "Supplier name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // First create the supplier
      const newSupplier = await createSupplier({
        name: addSupplierForm.name,
        address: addSupplierForm.address,
        phone: addSupplierForm.phone,
        email: addSupplierForm.email,
      });

      // Then link the supplier to the inventory item
      await linkSupplierToInventory(
        selectedInventoryItem.id,
        newSupplier.id,
        addSupplierForm.costPrice
      );

      toast({
        title: "Success",
        description: "Supplier created and linked successfully",
      });
      setIsAddSupplierDialogOpen(false);
      setAddSupplierForm({ name: "", address: "", phone: "", email: "", costPrice: 0 });
      loadInventorySuppliers(selectedInventoryItem.id);
      loadSuppliers(); // Reload suppliers list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create and link supplier",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSupplier = async (supplierId: number) => {
    if (!selectedInventoryItem) return;

    try {
      await unlinkSupplierFromInventory(selectedInventoryItem.id, supplierId);
      toast({
        title: "Success",
        description: "Supplier removed successfully",
      });
      loadInventorySuppliers(selectedInventoryItem.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove supplier",
        variant: "destructive",
      });
    }
  };

  const handleReceiveOrder = async (orderId: number) => {
    try {
      await receiveSupplierOrder(orderId);
      toast({
        title: "Success",
        description: "Order received and stock updated successfully",
      });
      // Reload order history and inventory
      if (selectedInventoryItem) {
        getOrderHistoryForInventory(selectedInventoryItem.id).then((orders) => {
          setOrderHistory(orders);
        });
      }
      loadInventory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to receive order",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (categoryName?: string) => {
    if (!categoryName) return "bg-gray-100 text-gray-800 border-gray-200";
    
    const name = categoryName.toLowerCase();
    if (name.includes("shirt") || name.includes("uniform")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    if (name.includes("book")) {
      return "bg-green-100 text-green-800 border-green-200";
    }
    if (name.includes("stationery")) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    if (name.includes("material")) {
      return "bg-purple-100 text-purple-800 border-purple-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
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
        <Badge className={`${getCategoryColor(item.category?.name)} border`}>
          {item.category?.name || "N/A"}
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
      key: "price",
      header: "Price",
      className: "text-center",
      render: (item) => (
        <span className="font-medium">₹{item.price || "0.00"}</span>
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
              setSelectedInventoryItem(item);
              // Load suppliers for this specific item
              loadInventorySuppliers(item.id).then(() => {
                getSuppliersForInventory(item.id).then((itemSups) => {
                  setItemSuppliers(itemSups);
                });
              });
              setSupplierOrderForm({
                supplierId: 0,
                inventoryId: item.id,
                quantity: 1,
                unitPrice: 0,
              });
              setIsSupplierOrderDialogOpen(true);
            }}
            title="Restock"
            className="text-green-600 hover:text-green-700"
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedInventoryItem(item);
              loadInventorySuppliers(item.id);
              setIsManageSuppliersDialogOpen(true);
            }}
            title="Manage Suppliers"
            className="text-blue-600 hover:text-blue-700"
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedInventoryItem(item);
              getOrderHistoryForInventory(item.id).then((orders) => {
                setOrderHistory(orders);
                setIsOrderHistoryDialogOpen(true);
              });
            }}
            title="Order History"
            className="text-purple-600 hover:text-purple-700"
          >
            <History className="w-4 h-4" />
          </Button>
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
                categoryId: item.categoryId,
                quantity: item.quantity,
                restockQuantity: item.restockQuantity,
                price: item.price,
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
            Manage inventory items and supplier orders
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
          pagination={{
            total: paginationMeta.total,
            totalPages: paginationMeta.totalPages,
          }}
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
        categories={categories}
        onAddSubmit={handleAddItem}
        onLoadLevels={loadLevels}
        onCategoryAdded={handleCategoryAdded}
        formError={formError}
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
        // Supplier Order Dialog Props
        isSupplierOrderDialogOpen={isSupplierOrderDialogOpen}
        setIsSupplierOrderDialogOpen={setIsSupplierOrderDialogOpen}
        supplierOrderForm={supplierOrderForm}
        setSupplierOrderForm={setSupplierOrderForm}
        itemSuppliers={itemSuppliers}
        inventory={inventory}
        onSupplierOrderSubmit={handlePlaceSupplierOrder}
        // Add Supplier Dialog Props
        isAddSupplierDialogOpen={isAddSupplierDialogOpen}
        setIsAddSupplierDialogOpen={setIsAddSupplierDialogOpen}
        addSupplierForm={addSupplierForm}
        setAddSupplierForm={setAddSupplierForm}
        onAddSupplierSubmit={handleAddSupplier}
        // Manage Suppliers Dialog Props
        isManageSuppliersDialogOpen={isManageSuppliersDialogOpen}
        setIsManageSuppliersDialogOpen={setIsManageSuppliersDialogOpen}
        selectedInventoryItem={selectedInventoryItem}
        inventorySuppliers={inventorySuppliers}
        onRemoveSupplier={handleRemoveSupplier}
        onOpenAddSupplier={() => {
          setIsManageSuppliersDialogOpen(false);
          setAddSupplierForm({ name: "", address: "", phone: "", email: "", costPrice: 0 });
          setIsAddSupplierDialogOpen(true);
        }}
        suppliers={suppliers}
        isOrderHistoryDialogOpen={isOrderHistoryDialogOpen}
        setIsOrderHistoryDialogOpen={setIsOrderHistoryDialogOpen}
        orderHistory={orderHistory}
        onReceiveOrder={handleReceiveOrder}
      />
    </div>
  );
}
