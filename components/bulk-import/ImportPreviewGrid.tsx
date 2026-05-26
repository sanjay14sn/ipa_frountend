"use client";

import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PreviewRow } from "@/services/bulk-import.service";

export interface PreviewSelectOption {
  /** The dropdown's underlying string value (typically the entity ID as string). */
  value: string;
  /** Human-readable label rendered in the dropdown row. */
  label: string;
  /**
   * Optional. If present, this is the actual value written to `row.data[key]`
   * when the option is picked — used for object-shaped cells like
   * `{ id, name }`. If absent, the panel falls back to writing `value`.
   */
  payload?: unknown;
}

export interface PreviewColumn {
  /** Key in the raw row data. Must match the CSV header. */
  key: string;
  /** Display label shown above the input. */
  label: string;
  /** Whether the cell is editable. Defaults to true. */
  editable?: boolean;
  /**
   * If provided, the field renders as a dropdown of these options instead
   * of a free-text input. Pass a function to compute options from the row's
   * other values (e.g. levels filtered by the row's program). The function
   * receives the RAW data record (objects/arrays preserved) so callers can
   * read both nested-object ids (`row.program?.id`) and arrays
   * (`row.previousLevelOptions`).
   */
  options?:
    | PreviewSelectOption[]
    | ((row: Record<string, unknown>) => PreviewSelectOption[]);
  /** Placeholder shown in the dropdown trigger when the cell is empty. */
  placeholder?: string;
}

interface ImportPreviewGridProps {
  rows: Array<PreviewRow<unknown>>;
  columns: PreviewColumn[];
  /** `value` is whatever should be written to `row.data[field]` — string for
   *  plain inputs, or the option's payload (e.g. `{id, name}`) for ref dropdowns. */
  onRowEdit: (rowIndex: number, field: string, value: unknown) => void;
  onRowDelete: (rowIndex: number) => void;
}

function fieldHasError(
  errors: Array<{ field: string; message: string }>,
  field: string,
): string | null {
  const match = errors.find((e) => e.field === field);
  return match?.message ?? null;
}

/**
 * Card-per-row preview. Each card lays out fields in a responsive grid so
 * nothing is truncated on narrow viewports. Errors render inline beneath
 * the offending field, not in a tooltip — much easier to act on.
 */
export function ImportPreviewGrid({
  rows,
  columns,
  onRowEdit,
  onRowDelete,
}: ImportPreviewGridProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No rows in this file.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const hasErrors = row.errors.length > 0;
        // Bucket errors per field so we can also surface unmatched-field errors
        // (e.g. cross-row consistency) at the card header.
        const fieldErrorKeys = new Set(row.errors.map((e) => e.field));
        const orphanErrors = row.errors.filter(
          (e) => !columns.some((c) => c.key === e.field),
        );

        return (
          <div
            key={row.rowIndex}
            className={cn(
              "rounded-lg border bg-background shadow-sm transition-colors",
              hasErrors
                ? "border-red-300 bg-red-50/30"
                : "border-border",
            )}
          >
            {/* Header strip */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2">
              <div className="flex items-center gap-2">
                {hasErrors ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                <span className="text-sm font-medium">
                  Row {row.rowIndex}
                </span>
                {hasErrors && (
                  <span className="text-xs text-red-600">
                    {row.errors.length}{" "}
                    {row.errors.length === 1 ? "issue" : "issues"}
                  </span>
                )}
                {!hasErrors && (
                  <span className="text-xs text-emerald-700">Ready</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRowDelete(row.rowIndex)}
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>

            {/* Field grid */}
            <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {columns.map((c) => {
                const errorMsg = fieldHasError(row.errors, c.key);
                const dataRow = row.data as Record<string, unknown>;
                const rawValue = dataRow[c.key];

                // For object cells like `{id, name, …}` we use `id` as the
                // Select value and `name` as the displayed text. For arrays
                // of refs we render a comma-joined name list (read-only).
                const isObjectRef =
                  rawValue !== null &&
                  typeof rawValue === "object" &&
                  !Array.isArray(rawValue);
                const isArrayRef = Array.isArray(rawValue);

                let cellValue: string;
                if (rawValue == null || rawValue === false || rawValue === "") {
                  cellValue = "";
                } else if (isObjectRef) {
                  cellValue = String((rawValue as { id?: unknown }).id ?? "");
                } else if (isArrayRef) {
                  cellValue = (rawValue as Array<Record<string, unknown>>)
                    .map((it) => String(it.name ?? it.code ?? it.id ?? ""))
                    .join(", ");
                } else {
                  cellValue = String(rawValue);
                }
                const isEditable = c.editable !== false && !isArrayRef;
                const inputId = `row-${row.rowIndex}-${c.key}`;

                // The per-row options builder receives the RAW data row so it
                // can read nested objects (`row.program?.id`) and arrays
                // (`row.previousLevelOptions`) directly. Static option arrays
                // pass through as-is.
                let optionList: PreviewSelectOption[] | null = null;
                if (c.options) {
                  optionList =
                    typeof c.options === "function"
                      ? c.options(dataRow)
                      : c.options;
                }
                // Keep the current value selectable even if it isn't in the
                // option list. The "(unknown)" suffix only fires when we have
                // a non-empty list to compare against — an empty list means
                // the lookups haven't loaded yet, not that the value is bad.
                if (
                  optionList &&
                  cellValue &&
                  !optionList.some((o) => o.value === cellValue)
                ) {
                  const displayName = isObjectRef
                    ? String(
                        (rawValue as { name?: unknown; code?: unknown }).name ??
                          (rawValue as { code?: unknown }).code ??
                          cellValue,
                      )
                    : cellValue;
                  const suffix = optionList.length > 0 ? " (unknown)" : "";
                  optionList = [
                    {
                      value: cellValue,
                      label: `${displayName}${suffix}`,
                      payload: rawValue,
                    },
                    ...optionList,
                  ];
                }

                return (
                  <div key={c.key} className="flex flex-col gap-1">
                    <label
                      htmlFor={inputId}
                      className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {c.label}
                    </label>
                    {!isEditable ? (
                      // Disabled input so the cell looks like every other
                      // field — same height, border, padding. The value is
                      // shown but the input is non-interactive.
                      (() => {
                        let display = cellValue;
                        if (isObjectRef) {
                          const ref = rawValue as {
                            name?: unknown;
                            code?: unknown;
                          };
                          const code = ref.code ? String(ref.code) : "";
                          const name = ref.name ? String(ref.name) : "";
                          display =
                            code && name
                              ? `${code} — ${name}`
                              : String(name || code || cellValue);
                        } else if (isArrayRef) {
                          display = cellValue;
                        }
                        return (
                          <Input
                            id={inputId}
                            value={display}
                            readOnly
                            disabled
                            className="h-8 cursor-not-allowed text-xs disabled:opacity-100"
                          />
                        );
                      })()
                    ) : optionList ? (
                      <Select
                        value={cellValue || undefined}
                        onValueChange={(v) => {
                          // For object-shaped cells, write the option's
                          // payload (full {id, name, ...}); otherwise just
                          // write the string value.
                          const picked = optionList!.find((o) => o.value === v);
                          onRowEdit(
                            row.rowIndex,
                            c.key,
                            picked?.payload !== undefined ? picked.payload : v,
                          );
                        }}
                      >
                        <SelectTrigger
                          id={inputId}
                          className={cn(
                            "h-8 text-xs",
                            errorMsg
                              ? "border-red-500 focus:ring-red-300"
                              : "",
                          )}
                        >
                          <SelectValue
                            placeholder={c.placeholder ?? "Select…"}
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {optionList.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              No options available
                            </div>
                          ) : (
                            optionList.map((o) => (
                              <SelectItem
                                key={o.value}
                                value={o.value}
                                className="text-xs"
                              >
                                {o.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={inputId}
                        value={cellValue}
                        onChange={(e) =>
                          onRowEdit(row.rowIndex, c.key, e.target.value)
                        }
                        className={cn(
                          "h-8 text-xs",
                          errorMsg
                            ? "border-red-500 focus-visible:ring-red-300"
                            : "",
                        )}
                      />
                    )}
                    {errorMsg && (
                      <p className="text-[11px] leading-tight text-red-600">
                        {errorMsg}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer: errors that don't map to a visible column
                (e.g. cross-row consistency, agreement-validity on row-level). */}
            {orphanErrors.length > 0 && (
              <div className="space-y-1 border-t border-red-200 bg-red-50/40 px-4 py-2">
                {orphanErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">
                    <span className="font-medium">{e.field}:</span> {e.message}
                  </p>
                ))}
              </div>
            )}

            {/* Hint about other field errors when there are many */}
            {hasErrors && fieldErrorKeys.size > 4 && orphanErrors.length === 0 && (
              <div className="border-t border-red-200 bg-red-50/40 px-4 py-2 text-xs text-red-700">
                {fieldErrorKeys.size} fields need fixing — see red labels above.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
