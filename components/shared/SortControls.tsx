import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUp, ArrowDown } from "lucide-react";

interface SortOption {
  value: string;
  label: string;
}

interface SortControlsProps {
  sortBy: string;
  sortOrder: "ASC" | "DESC";
  onSortByChange: (value: string) => void;
  onSortOrderToggle: () => void;
  sortOptions: SortOption[];
  className?: string;
}

export function SortControls({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderToggle,
  sortOptions,
  className = "",
}: SortControlsProps) {
  return (
    <>
      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className={`w-[180px] ${className}`}>
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={onSortOrderToggle} variant="outline" className="w-[140px]">
        {sortOrder === "ASC" ? (
          <>
            <ArrowUp className="w-4 h-4 mr-2" />
            Ascending
          </>
        ) : (
          <>
            <ArrowDown className="w-4 h-4 mr-2" />
            Descending
          </>
        )}
      </Button>
    </>
  );
}
