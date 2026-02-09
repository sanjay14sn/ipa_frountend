"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  type CreateInventoryDto,
  type UpdateInventoryDto,
  type Inventory,
} from "@/services/inventory.service";
import { type Program } from "@/services/program.service";
import { type Level } from "@/services/level.service";
import { type Supplier } from "@/services/supplier.service";
import { type InventorySupplier } from "@/services/inventory.service";
import { type InventoryCategory } from "@/services/inventory-category.service";
import { CategorySelect } from "@/components/inventory/CategorySelect";
import { Badge } from "@/components/ui/badge";

interface InventoryDialogsProps {
  // Add Dialog
  isAddDialogOpen: boolean;
  setIsAddDialogOpen: (open: boolean) => void;
  formData: CreateInventoryDto;
  setFormData: (data: CreateInventoryDto) => void;
  programs: Program[];
  levels: Level[];
  categories: InventoryCategory[];
  onAddSubmit: () => void;
  onLoadLevels: (programId: number) => void;
  onCategoryAdded?: (category: InventoryCategory) => void;
  formError?: string;

  // Edit Dialog
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  editFormData: UpdateInventoryDto;
  setEditFormData: (data: UpdateInventoryDto) => void;
  onEditSubmit: () => void;

  // Stock Dialog
  isStockDialogOpen: boolean;
  setIsStockDialogOpen: (open: boolean) => void;
  stockItem: Inventory | null;
  stockQuantity: number;
  setStockQuantity: (quantity: number) => void;
  onStockSubmit: () => void;

  // Delete Dialog
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  deletingItem: Inventory | null;
  onDeleteSubmit: () => void;

  // Supplier Order Dialog
  isSupplierOrderDialogOpen: boolean;
  setIsSupplierOrderDialogOpen: (open: boolean) => void;
  supplierOrderForm: {
    supplierId: number;
    inventoryId: number;
    quantity: number;
    unitPrice: number;
  };
  setSupplierOrderForm: (form: any) => void;
  itemSuppliers: InventorySupplier[];
  inventory: Inventory[];
  onSupplierOrderSubmit: () => void;

  // Add Supplier Dialog - changed to create new supplier
  isAddSupplierDialogOpen: boolean;
  setIsAddSupplierDialogOpen: (open: boolean) => void;
  addSupplierForm: {
    name: string;
    address: string;
    phone: string;
    email: string;
    costPrice: number;
  };
  setAddSupplierForm: (form: any) => void;
  onAddSupplierSubmit: () => void;

  // Manage Suppliers Dialog
  isManageSuppliersDialogOpen: boolean;
  setIsManageSuppliersDialogOpen: (open: boolean) => void;
  selectedInventoryItem: Inventory | null;
  inventorySuppliers: InventorySupplier[];
  onRemoveSupplier: (supplierId: number) => void;
  onOpenAddSupplier: () => void;
  suppliers: Supplier[]; // For all available suppliers

  // Order History Dialog
  isOrderHistoryDialogOpen: boolean;
  setIsOrderHistoryDialogOpen: (open: boolean) => void;
  orderHistory: any[]; // SupplierOrder[]
  onReceiveOrder: (orderId: number) => void;
}

export function InventoryDialogs({
  isAddDialogOpen,
  setIsAddDialogOpen,
  formData,
  setFormData,
  programs,
  levels,
  categories,
  onAddSubmit,
  onLoadLevels,
  onCategoryAdded,
  formError,
  isEditDialogOpen,
  setIsEditDialogOpen,
  editFormData,
  setEditFormData,
  onEditSubmit,
  isStockDialogOpen,
  setIsStockDialogOpen,
  stockItem,
  stockQuantity,
  setStockQuantity,
  onStockSubmit,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  deletingItem,
  onDeleteSubmit,
  isSupplierOrderDialogOpen,
  setIsSupplierOrderDialogOpen,
  supplierOrderForm,
  setSupplierOrderForm,
  itemSuppliers,
  inventory,
  onSupplierOrderSubmit,
  isAddSupplierDialogOpen,
  setIsAddSupplierDialogOpen,
  addSupplierForm,
  setAddSupplierForm,
  onAddSupplierSubmit,
  isManageSuppliersDialogOpen,
  setIsManageSuppliersDialogOpen,
  selectedInventoryItem,
  inventorySuppliers,
  onRemoveSupplier,
  onOpenAddSupplier,
  suppliers,
  isOrderHistoryDialogOpen,
  setIsOrderHistoryDialogOpen,
  orderHistory,
  onReceiveOrder,
}: InventoryDialogsProps) {
  return (
    <>
      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="programSelect">Program</Label>
                <Select
                  value={formData.programId?.toString() || ""}
                  onValueChange={(value) => {
                    const programId = Number(value);
                    setFormData({ ...formData, programId, levelId: 0 });
                    onLoadLevels(programId);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id.toString()}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="levelSelect">Level</Label>
                <Select
                  value={formData.levelId?.toString() || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, levelId: Number(value) })
                  }
                  disabled={!formData.programId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level.id} value={level.id.toString()}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <CategorySelect
                value={formData.categoryId?.toString() || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    categoryId: Number(value),
                  })
                }
                categories={categories}
                onCategoryAdded={onCategoryAdded}
                placeholder="Select Category"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Initial Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity === 0 || formData.quantity === undefined || formData.quantity === null ? "" : formData.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      quantity: val === "" ? 0 : Number(val),
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restockQuantity">Restock Alert</Label>
                <Input
                  id="restockQuantity"
                  type="number"
                  min="0"
                  value={formData.restockQuantity === 0 || formData.restockQuantity === undefined || formData.restockQuantity === null ? "" : formData.restockQuantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      restockQuantity: val === "" ? 0 : Number(val),
                    });
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.price === 0 || formData.price === undefined || formData.price === null ? "" : formData.price}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    price: val === "" ? 0 : Number(val),
                  });
                }}
              />
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
            {formError && isAddDialogOpen && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onAddSubmit}
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
            <div className="space-y-2">
              <Label htmlFor="editCategory">Category</Label>
              <CategorySelect
                value={editFormData.categoryId?.toString() || ""}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    categoryId: Number(value),
                  })
                }
                categories={categories}
                onCategoryAdded={onCategoryAdded}
                placeholder="Select Category"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editQuantity">Quantity</Label>
                <Input
                  id="editQuantity"
                  type="number"
                  min="0"
                  value={editFormData.quantity === 0 || editFormData.quantity === undefined || editFormData.quantity === null ? "" : editFormData.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditFormData({
                      ...editFormData,
                      quantity: val === "" ? 0 : Number(val),
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRestockQuantity">Restock Alert</Label>
                <Input
                  id="editRestockQuantity"
                  type="number"
                  min="0"
                  value={editFormData.restockQuantity === 0 || editFormData.restockQuantity === undefined || editFormData.restockQuantity === null ? "" : editFormData.restockQuantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditFormData({
                      ...editFormData,
                      restockQuantity: val === "" ? 0 : Number(val),
                    });
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPrice">Price (₹)</Label>
              <Input
                id="editPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={editFormData.price ?? ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    price: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
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
            {formError && isEditDialogOpen && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onEditSubmit}
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
                value={stockQuantity === 0 || stockQuantity === undefined || stockQuantity === null ? "" : stockQuantity}
                onChange={(e) => {
                  const val = e.target.value;
                  setStockQuantity(val === "" ? 0 : Number(val));
                }}
              />
            </div>
            {stockItem && stockQuantity <= stockItem.restockQuantity && (
              <p className="text-sm text-orange-600">
                Warning: Stock is at or below restock level (
                {stockItem.restockQuantity})
              </p>
            )}
            {formError && isStockDialogOpen && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                {formError}
              </div>
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
              onClick={onStockSubmit}
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
              onClick={onDeleteSubmit}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Supplier Order Dialog */}
      <Dialog open={isSupplierOrderDialogOpen} onOpenChange={setIsSupplierOrderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Place Supplier Order</DialogTitle>
            <DialogDescription>
              Order inventory items from suppliers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select
                value={supplierOrderForm.supplierId?.toString() || ""}
                onValueChange={(value) =>
                  setSupplierOrderForm({
                    ...supplierOrderForm,
                    supplierId: Number(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {itemSuppliers.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">
                      No suppliers linked. Add a supplier first.
                    </div>
                  ) : (
                    itemSuppliers.map((invSupplier) => (
                      <SelectItem key={invSupplier.id} value={invSupplier.supplierId.toString()}>
                        {invSupplier.supplier?.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventoryItem">Inventory Item</Label>
              <Select
                value={supplierOrderForm.inventoryId?.toString() || ""}
                onValueChange={(value) =>
                  setSupplierOrderForm({
                    ...supplierOrderForm,
                    inventoryId: Number(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Item" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={supplierOrderForm.quantity === 0 || supplierOrderForm.quantity === undefined || supplierOrderForm.quantity === null ? "" : supplierOrderForm.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupplierOrderForm({
                      ...supplierOrderForm,
                      quantity: val === "" ? 0 : Number(val),
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price (₹)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={supplierOrderForm.unitPrice === 0 || supplierOrderForm.unitPrice === undefined || supplierOrderForm.unitPrice === null ? "" : supplierOrderForm.unitPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupplierOrderForm({
                      ...supplierOrderForm,
                      unitPrice: val === "" ? 0 : Number(val),
                    });
                  }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              Total Amount: ₹
              {(supplierOrderForm.quantity * supplierOrderForm.unitPrice).toFixed(2)}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSupplierOrderDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onSupplierOrderSubmit}
              className="bg-green-600 hover:bg-green-700"
            >
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Supplier Dialog - Create New Supplier */}
      <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Supplier to {selectedInventoryItem?.name}</DialogTitle>
            <DialogDescription>
              Create a new supplier and link it to this inventory item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier Name *</Label>
              <Input
                id="supplierName"
                placeholder="Enter supplier name"
                value={addSupplierForm.name}
                onChange={(e) =>
                  setAddSupplierForm({
                    ...addSupplierForm,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierAddress">Address</Label>
              <Input
                id="supplierAddress"
                placeholder="Enter supplier address"
                value={addSupplierForm.address}
                onChange={(e) =>
                  setAddSupplierForm({
                    ...addSupplierForm,
                    address: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="supplierPhone">Phone</Label>
                <Input
                  id="supplierPhone"
                  placeholder="Contact number"
                  value={addSupplierForm.phone}
                  onChange={(e) =>
                    setAddSupplierForm({
                      ...addSupplierForm,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierEmail">Email</Label>
                <Input
                  id="supplierEmail"
                  type="email"
                  placeholder="Email address"
                  value={addSupplierForm.email}
                  onChange={(e) =>
                    setAddSupplierForm({
                      ...addSupplierForm,
                      email: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price (₹)</Label>
              <Input
                id="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={addSupplierForm.costPrice === 0 || addSupplierForm.costPrice === undefined || addSupplierForm.costPrice === null ? "" : addSupplierForm.costPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddSupplierForm({
                    ...addSupplierForm,
                    costPrice: val === "" ? 0 : Number(val),
                  });
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddSupplierDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onAddSupplierSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create & Link Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Suppliers Dialog */}
      <Dialog open={isManageSuppliersDialogOpen} onOpenChange={setIsManageSuppliersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Suppliers for {selectedInventoryItem?.name}</DialogTitle>
            <DialogDescription>
              View and manage suppliers linked to this item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {inventorySuppliers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No suppliers linked yet.
              </p>
            ) : (
              <div className="space-y-2">
                {inventorySuppliers.map((invSupplier) => (
                  <div
                    key={invSupplier.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{invSupplier.supplier?.name}</p>
                      <p className="text-sm text-gray-500">
                        Cost Price: ₹{invSupplier.costPrice}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveSupplier(invSupplier.supplierId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsManageSuppliersDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={onOpenAddSupplier}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order History Dialog */}
      <Dialog open={isOrderHistoryDialogOpen} onOpenChange={setIsOrderHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order History</DialogTitle>
            <DialogDescription>
              All supplier orders for this item
           </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {orderHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No orders found for this item.
              </p>
            ) : (
              orderHistory.map((order: any) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">
                        Supplier: {order.supplier?.name || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          order.status === "Received"
                            ? "bg-green-100 text-green-800"
                            : order.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {order.status}
                      </Badge>
                      {order.status === "Pending" && (
                        <Button
                          size="sm"
                          onClick={() => onReceiveOrder(order.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Receive
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Total: ₹{order.totalAmount}</p>
                    {order.items && order.items.length > 0 && (
                      <p className="text-sm">
                        Quantity: {order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} units
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Ordered:</span>{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {order.receivedAt && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Received:</span>{" "}
                        {new Date(order.receivedAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsOrderHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
