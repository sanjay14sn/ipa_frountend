"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface InventoryCategory {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
}

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
  placeholder = "Select category",
  disabled = false,
}: CategorySelectProps) {
  return (
    <Select
      value={value || ""}
      onValueChange={onValueChange}
      disabled={disabled || categories.length === 0}
    >
      <SelectTrigger>
        <SelectValue
          placeholder={
            categories.length === 0 ? "No categories — add one first" : placeholder
          }
        />
      </SelectTrigger>
      <SelectContent>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id.toString()}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
