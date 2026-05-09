"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Save } from "lucide-react";
import {
  getFranchiseProgramKitItems,
  getProgramKitItems,
  setFranchiseProgramKitItems,
} from "@/services/inventory.service";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { StartingKitEditor, type KitRow } from "@/app/admin/franchise/components/StartingKitEditor";

interface Props {
  franchiseId: string;
  programId: number | null;
}

export function FranchiseStartingKitSection({ franchiseId, programId }: Props) {
  const queryClient = useQueryClient();
  const [kitRows, setKitRows] = useState<KitRow[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: masterKitItems, isLoading: masterLoading } = useQuery({
    queryKey: ["program-kit-items", programId],
    queryFn: () => getProgramKitItems(programId!),
    enabled: programId != null,
  });

  const { data: franchiseKitItems, isLoading: franchiseLoading } = useQuery({
    queryKey: ["franchise-kit", franchiseId, programId],
    queryFn: () => getFranchiseProgramKitItems(franchiseId, programId!),
    enabled: programId != null,
  });

  useEffect(() => {
    if (!masterKitItems) return;

    const selectedMap = new Map(
      (franchiseKitItems ?? []).map((item) => [item.programKitId, item]),
    );

    setKitRows(
      masterKitItems.map((item) => {
        const selected = selectedMap.get(item.programKitId);
        return {
          programKitId: item.programKitId,
          inventoryItemName: item.name,
          defaultQuantity: item.defaultQuantity ?? 1,
          selected: selected != null,
          quantity: selected?.quantity ?? item.defaultQuantity ?? 1,
        };
      }),
    );
  }, [masterKitItems, franchiseKitItems]);

  const handleSave = async () => {
    if (programId == null) return;
    setSaving(true);
    try {
      const selectedItems = kitRows
        .filter((r) => r.selected)
        .map((r) => ({ programKitId: r.programKitId, quantity: r.quantity }));

      await setFranchiseProgramKitItems(franchiseId, programId, selectedItems);
      await queryClient.invalidateQueries({
        queryKey: ["franchise-kit", franchiseId, programId],
      });
      toast.success("Starting kit updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save starting kit"));
    } finally {
      setSaving(false);
    }
  };

  const isLoading = masterLoading || franchiseLoading;

  if (programId == null) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        No program is assigned to this franchise yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b border-border bg-accent/30 px-4 py-4 sm:px-5">
        <h2 className="flex items-center gap-2 text-base font-medium text-card-foreground">
          <Package className="h-4 w-4 text-primary" />
          Starting Kit
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Items allocated to this franchise at program start. Select items and
          set quantities, then save.
        </p>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading kit items…
          </div>
        ) : (
          <div className="space-y-4">
            <StartingKitEditor
              rows={kitRows}
              onChange={setKitRows}
              disabled={saving}
            />

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="h-9 gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
