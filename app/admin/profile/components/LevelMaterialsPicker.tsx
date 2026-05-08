"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  useAllInventory,
  useInventoryItemsForLevel,
} from "@/hooks/api/inventory.hooks";
import {
  assignInventoryToLevel,
  unassignInventoryFromLevel,
} from "@/services/inventory.service";

export function LevelMaterialsPicker({
  levelId,
  disabled,
}: {
  levelId: number;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | "">("");

  const { data: catalog = [], isLoading: isLoadingCatalog } = useAllInventory(
    hasRequested,
  );
  const {
    data: assigned = [],
    isLoading: isLoadingAssigned,
    refetch: refetchAssigned,
  } = useInventoryItemsForLevel(levelId, hasRequested);

  const assignedIds = useMemo(() => new Set(assigned.map((i) => i.id)), [assigned]);
  const available = useMemo(
    () => catalog.filter((i) => !assignedIds.has(i.id)),
    [catalog, assignedIds],
  );
  const catalogEmpty = hasRequested && catalog.length === 0;

  const handleAdd = async (inventoryId: number) => {
    try {
      await assignInventoryToLevel(levelId, inventoryId);
      toast({ title: "Item linked to level" });
      await refetchAssigned();
    } catch (e) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(e),
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (inventoryId: number) => {
    try {
      await unassignInventoryFromLevel(levelId, inventoryId);
      toast({ title: "Removed from level" });
      await refetchAssigned();
    } catch (e) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {!hasRequested ? (
        <span className="text-xs text-muted-foreground">Open to load</span>
      ) : catalogEmpty ? (
        <span className="text-xs text-muted-foreground">No catalog items</span>
      ) : isLoadingAssigned || isLoadingCatalog ? (
        <span className="text-xs text-muted-foreground">Loading...</span>
      ) : (
        <span className="text-xs text-muted-foreground">{assigned.length} linked</span>
      )}

      {!disabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6 shrink-0"
            title="Manage materials"
            aria-label="Manage materials"
            onClick={() => {
              if (!hasRequested) setHasRequested(true);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Level Materials</DialogTitle>
                <DialogDescription>
                  Add and remove inventory items for this level.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-sm font-medium">Linked items</div>
                  {isLoadingAssigned || isLoadingCatalog ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : assigned.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No linked items.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assigned.map((item) => (
                        <Badge
                          key={item.id}
                          variant="secondary"
                          className="h-7 max-w-full gap-1 py-0 pl-1.5 pr-1 font-normal"
                        >
                          <span className="max-w-[220px] truncate">{item.name}</span>
                          <button
                            type="button"
                            disabled={disabled}
                            className="rounded-sm px-1 text-gray-500 hover:bg-muted hover:text-destructive disabled:opacity-50"
                            aria-label={`Remove ${item.name}`}
                            onClick={() => void handleRemove(item.id)}
                          >
                            x
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {catalogEmpty ? (
                  <p className="text-sm text-muted-foreground">No catalog items available.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-[1fr,120px]">
                    <Select
                      value={selectedItemId === "" ? "none" : String(selectedItemId)}
                      onValueChange={(value) =>
                        setSelectedItemId(value === "none" ? "" : Number(value))
                      }
                      disabled={isLoadingAssigned || isLoadingCatalog}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select inventory item" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select inventory item</SelectItem>
                        {available.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      disabled={selectedItemId === ""}
                      onClick={() => {
                        if (selectedItemId !== "") {
                          void handleAdd(selectedItemId);
                          setSelectedItemId("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
