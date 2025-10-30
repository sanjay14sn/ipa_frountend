"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminTable } from "@/components/shared";
import type { AdminTableColumn } from "@/components/shared/AdminTable";
import {
  getInventoryByLevel,
  createInventory,
  updateInventory,
  updateStock,
  deleteInventory,
  type Inventory,
  type CreateInventoryDto,
  type UpdateInventoryDto,
  InventoryCategory,
} from "@/services/inventory.service";
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

interface InventoryManagementProps {
  programId: number;
  levelId: number;
  levelName: string;
}

export function InventoryManagement({
  programId,
  levelId,
  levelName,
}: InventoryManagementProps) {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [stockItem, setStockItem] = useState<Inventory | null>(null);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [deletingItem, setDeletingItem] = useState<Inventory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const itemsPerPage = 10;

  const [formData, setFormData] = useState<
    Omit<CreateInventoryDto, "programId" | "levelId">
  >({
    name: "",
    description: "",
    category: InventoryCategory.OTHER,
    price: 0,
    quantity: 0,
    restockQuantity: 10,
    isActive: true,
  });

  const [editFormData, setEditFormData] = useState<UpdateInventoryDto>({});

  useEffect(() => {
    loadInventory();
  }, [levelId]);

  const loadInventory = async () => {
    try {
      const data = await getInventoryByLevel(levelId);
      setInventory(data);
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
      isActive: true,
    });
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

    try {
      await createInventory({
        ...formData,
        programId,
        levelId,
      });
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
      toast({
        title: "Success",
        description: "Stock updated successfully",
      });
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

  const totalPages = Math.ceil(inventory.length / itemsPerPage);
  const paginatedInventory = inventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns: AdminTableColumn<Inventory>[] = [
    {
      key: "item",
      header: "Item",
      className: "w-[250px]",
    },
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Inventory for {levelName}
          </h3>
          <Badge variant="secondary">{inventory.length}</Badge>
        </div>
        <Button
          size="sm"
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

      <AdminTable
        data={paginatedInventory}
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
        pagination={{ total: inventory.length, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        emptyMessage={`No inventory items found for ${levelName}.`}
        resultsText={(count, total) => `Showing ${count} of ${total} items`}
      />

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to {levelName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                placeholder="e.g., Level 1 Textbook"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Item description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value as InventoryCategory,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(InventoryCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Initial Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restockQuantity">Restock Alert</Label>
                <Input
                  id="restockQuantity"
                  type="number"
                  min="0"
                  value={formData.restockQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      restockQuantity: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              className="bg-primary hover:bg-brand-green-600"
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update item details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="editName">Item Name</Label>
              <Input
                id="editName"
                value={editFormData.name || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={editFormData.description || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editCategory">Category</Label>
                <Select
                  value={editFormData.category}
                  onValueChange={(value) =>
                    setEditFormData({
                      ...editFormData,
                      category: value as InventoryCategory,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(InventoryCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPrice">Price (₹)</Label>
                <Input
                  id="editPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.price || 0}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      price: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editQuantity">Quantity</Label>
                <Input
                  id="editQuantity"
                  type="number"
                  min="0"
                  value={editFormData.quantity || 0}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      quantity: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRestockQuantity">Restock Alert</Label>
                <Input
                  id="editRestockQuantity"
                  type="number"
                  min="0"
                  value={editFormData.restockQuantity || 0}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      restockQuantity: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="editIsActive"
                checked={editFormData.isActive ?? false}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, isActive: checked })
                }
              />
              <Label htmlFor="editIsActive">Active</Label>
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
              onClick={handleEditItem}
              className="bg-primary hover:bg-brand-green-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Stock Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Update stock for {stockItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Quantity</Label>
              <Input
                id="stockQuantity"
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
              />
            </div>
            {stockItem && stockQuantity <= stockItem.restockQuantity && (
              <p className="text-sm text-orange-600">
                Warning: Stock is at or below restock level (
                {stockItem.restockQuantity})
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStockDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStock}
              className="bg-primary hover:bg-brand-green-600"
            >
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingItem?.name}". This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
