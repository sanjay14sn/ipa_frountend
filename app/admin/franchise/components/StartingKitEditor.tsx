"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RawTableSurface } from "@/components/shared";
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
    <RawTableSurface className="overflow-x-auto rounded-lg shadow-none">
      <Table>
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className="w-8" />
            <TableHead>Item</TableHead>
            <TableHead className="w-28 text-center">Default qty</TableHead>
            <TableHead className="w-32 text-center">Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.programKitId}
              className={row.selected ? "" : "opacity-50"}
            >
              <TableCell className="px-3 py-2.5">
                <Checkbox
                  checked={row.selected}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    toggle(row.programKitId, Boolean(checked))
                  }
                />
              </TableCell>
              <TableCell className="px-3 py-2.5 font-medium text-card-foreground">
                {row.inventoryItemName}
              </TableCell>
              <TableCell className="px-3 py-2.5 text-center text-muted-foreground">
                {row.defaultQuantity}
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Input
                  type="number"
                  min={1}
                  value={row.quantity}
                  disabled={disabled || !row.selected}
                  onChange={(e) =>
                    setQuantity(row.programKitId, Number(e.target.value))
                  }
                  className="mx-auto h-8 w-24 text-center"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RawTableSurface>
  );
}
