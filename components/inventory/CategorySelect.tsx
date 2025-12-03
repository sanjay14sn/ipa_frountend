"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import {
  type InventoryCategory,
  getInventoryCategories,
  createInventoryCategory,
} from "@/services/inventory-category.service";
import { useToast } from "@/hooks/use-toast";

interface CategorySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  categories: InventoryCategory[];
  onCategoryAdded?: (category: InventoryCategory) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategorySelect({
  value,
  onValueChange,
  categories,
  onCategoryAdded,
  placeholder = "Select category",
  disabled = false,
}: CategorySelectProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const newCategory = await createInventoryCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || "",
        isActive: true,
      });

      toast({
        title: "Success",
        description: "Category created successfully",
      });

      // Call the callback to refresh categories
      if (onCategoryAdded) {
        onCategoryAdded(newCategory);
      }

      // Reset form
      setNewCategoryName("");
      setNewCategoryDescription("");
      setIsAddDialogOpen(false);

      // Set the newly created category as selected after a brief delay
      // to ensure the categories list is updated
      setTimeout(() => {
        onValueChange(newCategory.id.toString());
      }, 100);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create category",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Select
        value={value || ""}
        onValueChange={(selectedValue) => {
          if (selectedValue === "__add_new__") {
            setIsAddDialogOpen(true);
          } else {
            onValueChange(selectedValue);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id.toString()}>
              {cat.name}
            </SelectItem>
          ))}
          <SelectItem
            value="__add_new__"
            className="text-blue-600 font-medium"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Add New Category</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new inventory category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="categoryName"
                placeholder="e.g., Electronics"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreating) {
                    handleAddCategory();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                placeholder="Optional description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewCategoryName("");
                setNewCategoryDescription("");
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

