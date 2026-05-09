"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export type KitRow = {
  programKitId: number;
  inventoryItemName: string;
  defaultQuantity: number;
  selected: boolean;
  quantity: number;
};

interface Props {
  rows: KitRow[];
  onChange: (rows: KitRow[]) => void;
  disabled?: boolean;
}

export function StartingKitEditor({ rows, onChange, disabled }: Props) {
  const toggle = (programKitId: number, selected: boolean) => {
    onChange(
      rows.map((row) =>
        row.programKitId === programKitId ? { ...row, selected } : row,
      ),
    );
  };

  const setQuantity = (programKitId: number, qty: number) => {
    onChange(
      rows.map((row) =>
        row.programKitId === programKitId
          ? { ...row, quantity: Math.max(1, qty) }
          : row,
      ),
    );
  };

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No kit items are configured for this program.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-accent/30">
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-8" />
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              Item
            </th>
            <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-28">
              Default qty
            </th>
            <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-32">
              Quantity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr
              key={row.programKitId}
              className={row.selected ? "" : "opacity-50"}
            >
              <td className="px-3 py-2.5">
                <Checkbox
                  checked={row.selected}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    toggle(row.programKitId, Boolean(checked))
                  }
                />
              </td>
              <td className="px-3 py-2.5 font-medium text-card-foreground">
                {row.inventoryItemName}
              </td>
              <td className="px-3 py-2.5 text-center text-muted-foreground">
                {row.defaultQuantity}
              </td>
              <td className="px-3 py-2.5">
                <Input
                  type="number"
                  min={1}
                  value={row.quantity}
                  disabled={disabled || !row.selected}
                  onChange={(e) =>
                    setQuantity(row.programKitId, Number(e.target.value))
                  }
                  className="h-8 w-24 text-center mx-auto"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
