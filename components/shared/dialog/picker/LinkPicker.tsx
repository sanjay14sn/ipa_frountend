"use client"

import * as React from "react"
import { Loader2, Save, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PickerSearch } from "./PickerSearch"

export interface LinkPickerLinkedProps<TLinked> {
  /** Linked items rendered as a row of badges/chips at the top. */
  items: TLinked[]
  /** Get a stable React key for each linked item. */
  getKey: (item: TLinked) => string | number
  /** Get the label shown inside the badge. */
  getLabel: (item: TLinked) => React.ReactNode
  /** Section title above the badges. Default "Linked items". */
  title?: React.ReactNode
  /** Called when the user clicks the "x" on a badge. If omitted, badges are read-only. */
  onUnlink?: (item: TLinked) => void
  /** Empty-state message when there are no linked items. */
  emptyMessage?: React.ReactNode
}

export interface LinkPickerAddProps<TItem> {
  /** Catalog items the user can pick from. */
  items: TItem[]
  /** Loading indicator for the catalog. */
  isLoading?: boolean
  /** Stable key per item. */
  getKey: (item: TItem) => string | number
  /** Whether an item is currently in the pending bucket. */
  isChecked: (item: TItem) => boolean
  /** Called when an item is toggled in the list. */
  onToggle: (item: TItem) => void
  /** Renderer for each list row. Receives the item and whether it's currently checked. */
  renderRow: (item: TItem, checked: boolean) => React.ReactNode
  /** Empty-state message when the catalog has nothing. */
  emptyMessage?: React.ReactNode
}

export interface LinkPickerProps<TLinked, TItem> {
  /** Linked items section (optional — omit if you only want the picker). */
  linked?: LinkPickerLinkedProps<TLinked>

  /** Section title for the "Add ..." card. Default "Add items". */
  addTitle?: React.ReactNode

  /** Pending count (drives the Save button label + pending header). */
  pendingCount: number
  /** Renderer for the pending-items preview (right column rows). */
  renderPending?: () => React.ReactNode
  /** Title for the pending column. Default `${pendingCount} selected`. */
  pendingTitle?: React.ReactNode
  /** Empty-state shown in the right column when nothing is selected. */
  pendingEmptyMessage?: React.ReactNode

  /** Save action. */
  onSave: () => void | Promise<void>
  isSaving?: boolean
  /** Override the save label. By default: "Save Changes (N)" when pending, else "Save Changes". */
  saveLabel?: React.ReactNode

  /** Search box state (controlled). */
  search: { value: string; onChange: (v: string) => void; placeholder?: string }

  /** Catalog list inputs. */
  list: LinkPickerAddProps<TItem>

  /**
   * When true, the picker fills available vertical space (use inside a parent that
   * constrains height, e.g. AppDialogBody layout="fill"). When false (default), the
   * columns use a fixed max-height.
   */
  fill?: boolean

  className?: string
}

/**
 * Two-column body section used by every picker popup:
 *   - Optional row of linked items (badges) above the picker
 *   - "Add ..." card with header (title + Save button) and two columns:
 *       LEFT  → Search + catalog list (the items you can pick from)
 *       RIGHT → Pending list (the items you've selected, with editable fields per row)
 *   - Each column scrolls independently. On mobile the columns stack (catalog on top).
 *
 * Use inside an AppDialogBody (or any parent) — chrome around it (header / footer)
 * comes from FormDialog / AppDialog.
 */
export function LinkPicker<TLinked, TItem>({
  linked,
  addTitle = "Add items",
  pendingCount,
  renderPending,
  pendingTitle,
  pendingEmptyMessage = "Tick items on the left to add them here.",
  onSave,
  isSaving,
  saveLabel,
  search,
  list,
  fill = false,
  className,
}: LinkPickerProps<TLinked, TItem>) {
  const hasPending = pendingCount > 0
  const renderedRows = (() => {
    if (list.isLoading) {
      return (
        <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )
    }
    if (list.items.length === 0) {
      return (
        <div className="px-3 py-6 text-sm text-muted-foreground">
          {list.emptyMessage ?? "Nothing to show."}
        </div>
      )
    }
    return list.items.map((item) => {
      const checked = list.isChecked(item)
      return (
        <div
          key={list.getKey(item)}
          className={cn(
            "border-b border-border last:border-b-0 transition-colors",
            checked ? "bg-primary/5" : "hover:bg-muted/40"
          )}
        >
          {list.renderRow(item, checked)}
        </div>
      )
    })
  })()

  const effectivePendingTitle =
    pendingTitle ??
    (hasPending
      ? `${pendingCount} selected — not yet saved`
      : "Selected items")

  return (
    <div
      className={cn(
        "flex flex-col gap-3 font-sans",
        fill ? "min-h-0 flex-1" : "min-h-0",
        className
      )}
    >
      {linked ? <LinkedItemsCard {...linked} /> : null}

      <div
        className={cn(
          "rounded-lg border border-border bg-card overflow-hidden",
          fill ? "flex min-h-0 flex-1 flex-col" : "flex flex-col"
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-accent/30 px-4 py-2.5">
          <h4 className="text-sm font-medium text-card-foreground">
            {addTitle}
          </h4>
          {hasPending ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void onSave()}
              disabled={isSaving}
              className="rounded-lg"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveLabel ?? `Save Changes (${pendingCount})`}
            </Button>
          ) : null}
        </header>

        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-2 md:divide-x divide-border",
            fill ? "min-h-0 flex-1" : "max-h-[420px]"
          )}
        >
          {/* LEFT — catalog list */}
          <div className="flex flex-col min-h-0 md:min-h-[260px]">
            <div className="shrink-0 px-3 py-2">
              <PickerSearch
                value={search.value}
                onChange={search.onChange}
                placeholder={search.placeholder ?? "Search…"}
              />
            </div>
            <div
              className={cn(
                "overflow-y-auto scrollbar-green divide-y divide-border",
                fill ? "min-h-0 flex-1" : "max-h-[360px]"
              )}
            >
              {renderedRows}
            </div>
          </div>

          {/* RIGHT — pending list */}
          <div className="flex flex-col min-h-0 md:min-h-[260px] border-t md:border-t-0 border-border">
            <div className="shrink-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              {effectivePendingTitle}
            </div>
            <div
              className={cn(
                "overflow-y-auto scrollbar-green px-3 pb-3",
                fill ? "min-h-0 flex-1" : "max-h-[360px]"
              )}
            >
              {hasPending && renderPending ? (
                renderPending()
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {pendingEmptyMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LinkedItemsCard<TLinked>({
  items,
  getKey,
  getLabel,
  title = "Linked items",
  onUnlink,
  emptyMessage,
}: LinkPickerLinkedProps<TLinked>) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2 font-sans">
      <h4 className="text-sm font-medium text-card-foreground">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {emptyMessage ?? "No linked items yet."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-green">
          {items.map((item) => (
            <Badge
              key={getKey(item)}
              variant="secondary"
              className={cn(
                "h-7 gap-1 rounded-full py-0 pl-2.5 font-normal",
                onUnlink ? "pr-1" : "pr-2.5"
              )}
            >
              <span className="max-w-[220px] truncate">{getLabel(item)}</span>
              {onUnlink ? (
                <button
                  type="button"
                  className="rounded-sm px-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label="Remove"
                  onClick={() => onUnlink(item)}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
