import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RawTableSurface } from "@/components/shared/table-shell";

export interface ItemsTableColumn<T> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
}

export interface ItemsTableProps<T> {
  columns: ItemsTableColumn<T>[];
  rows: T[];
  /** Tighter cells for embedded expanded-row usage. */
  dense?: boolean;
  emptyLabel?: string;
  className?: string;
}

const ALIGN_CLASS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

/**
 * The one small embedded item/qty table (expanded rows, dialogs) — replaces
 * the hand-rolled `<table className="min-w-full text-sm">` grids. Built on
 * ui/table primitives inside RawTableSurface so the canonical 11px-uppercase
 * header comes for free.
 */
export function ItemsTable<T>({
  columns,
  rows,
  dense = false,
  emptyLabel = "No items",
  className,
}: ItemsTableProps<T>) {
  return (
    <RawTableSurface className={className}>
      <div data-testid="items-table">
        <Table>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap",
                    col.align && ALIGN_CLASS[col.align],
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={i} className={dense ? "h-9" : "h-10"}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        dense ? "px-3 py-1.5" : "px-3 py-2",
                        col.align && ALIGN_CLASS[col.align],
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : (((row as Record<string, unknown>)[
                            col.key
                          ] as React.ReactNode) ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </RawTableSurface>
  );
}
