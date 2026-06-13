"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/dialog/templates/ConfirmDialog";
import { fmtShortDate } from "@/components/agreements/record-detail/agreement-utils";
import type { ReceivableSummaryItem } from "@/services/agreement.service";

/** ISO datetime → "YYYY-MM-DD" for a date input value. */
function toDateValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

interface EditableDueDateCellProps {
  item: ReceivableSummaryItem;
  /** Commits the new due date. Receives a full ISO datetime string. */
  onConfirm: (itemId: number, dueAtISO: string) => Promise<void>;
  /** True while the parent mutation is in flight. */
  isSubmitting?: boolean;
}

export function EditableDueDateCell({
  item,
  onConfirm,
  isSubmitting,
}: EditableDueDateCellProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Set synchronously in onChange so the deferred blur handler can tell a
  // picker-selection (change → blur in the same tick) from a true dismissal.
  const confirmPendingRef = useRef(false);

  const current = toDateValue(item.dueAt);

  // After a successful save the parent refetches and item.dueAt changes —
  // collapse back to the view box.
  useEffect(() => {
    setMode("view");
    setConfirmOpen(false);
    confirmPendingRef.current = false;
  }, [item.dueAt]);

  // On entering edit mode, focus the field and open the native picker if the
  // browser allows it without a fresh user gesture.
  useEffect(() => {
    if (mode !== "edit") return;
    const el = inputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    if (!el) return;
    el.focus();
    try {
      el.showPicker?.();
    } catch {
      // Some browsers require a user gesture for showPicker(); focus is enough.
    }
  }, [mode]);

  function startEdit() {
    setDraft(current);
    confirmPendingRef.current = false;
    setMode("edit");
  }

  function toView() {
    setConfirmOpen(false);
    setMode("view");
    setDraft("");
    confirmPendingRef.current = false;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setDraft(next);
    if (next && next !== current) {
      confirmPendingRef.current = true;
      setConfirmOpen(true);
    }
  }

  function handleBlur() {
    // Defer so an in-progress picker selection can flag a pending confirm first.
    setTimeout(() => {
      if (!confirmPendingRef.current) toView();
    }, 0);
  }

  async function handleConfirm() {
    try {
      await onConfirm(item.receivableItemId, new Date(draft).toISOString());
      setConfirmOpen(false);
      // mode resets to "view" via the item.dueAt effect once the refetch lands.
    } catch {
      // Error toast is surfaced by the mutation hook; keep the dialog open to retry.
    }
  }

  if (mode === "view") {
    return (
      <button
        type="button"
        aria-label="Edit due date"
        onClick={startEdit}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-sm text-card-foreground transition-colors hover:border-primary/50 hover:bg-accent"
      >
        {fmtShortDate(item.dueAt)}
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </button>
    );
  }

  return (
    <>
      <Input
        ref={inputRef}
        type="date"
        aria-label="Due date"
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        className="h-8 w-[150px]"
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) toView();
        }}
        title="Change due date?"
        description={
          <>
            From{" "}
            <span className="font-medium text-foreground">
              {fmtShortDate(item.dueAt)}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {fmtShortDate(draft)}
            </span>
            .
          </>
        }
        confirmLabel="Save"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        isConfirming={isSubmitting}
      />
    </>
  );
}
