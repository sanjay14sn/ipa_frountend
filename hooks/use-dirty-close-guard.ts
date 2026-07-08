"use client";

import { useCallback, useState } from "react";

/**
 * Guards a dialog's close funnel when the form holds unsaved input.
 *
 * Route every close path (X button, Esc, overlay click, explicit Cancel)
 * through `requestClose(false)`: when `isDirty` it opens a confirmation
 * instead of closing, and `confirmAndDiscard` performs the actual
 * discard + close via `onDiscard`. The consumer renders the ConfirmDialog
 * itself using `confirmOpen`/`setConfirmOpen`/`confirmAndDiscard`.
 */
export function useDirtyCloseGuard({
  isDirty,
  onDiscard,
}: {
  isDirty: boolean;
  onDiscard: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = useCallback(
    (open: boolean) => {
      if (open) return;
      if (isDirty) {
        setConfirmOpen(true);
        return;
      }
      onDiscard();
    },
    [isDirty, onDiscard],
  );

  const confirmAndDiscard = useCallback(() => {
    setConfirmOpen(false);
    onDiscard();
  }, [onDiscard]);

  return { requestClose, confirmOpen, setConfirmOpen, confirmAndDiscard };
}
