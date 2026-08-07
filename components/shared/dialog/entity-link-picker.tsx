"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Package as PackageIcon, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
} from "@/components/shared/dialog";

/**
 * One generic "link entities to a level" dialog (CMP-09) — the three former
 * pickers (level materials, training-level materials, level certificates)
 * are thin config wrappers around this. Catalog loads lazily on first open.
 * Service calls and toasts stay with the caller via assign/unassign.
 */

interface QueryLike<T> {
  data?: T[];
  isLoading: boolean;
}

export interface EntityLinkPickerCommonProps<
  TCatalog extends { id?: number | null },
  TAssigned extends { id?: number | null },
> {
  /** Trigger title/aria-label, e.g. "Manage materials". */
  triggerLabel: string;
  triggerIcon?: LucideIcon;
  dialogTitle: string;
  dialogDescription: string;
  disabled?: boolean;
  /** Lazy: enabled on first open. */
  useCatalog: (enabled: boolean) => QueryLike<TCatalog>;
  useAssigned: (
    enabled: boolean,
  ) => QueryLike<TAssigned> & { refetch: () => Promise<unknown> };
  unassign: (id: number) => Promise<unknown>;
  /** Linked-count display next to the trigger. @default "text" */
  counter?: "text" | "badge";
  counterNoun?: string;
  /**
   * The dialog body. A SLOT, not a `panel: "inventory" | "certificate"` switch:
   * this component lives in the shared kit, and switching on a domain name
   * meant importing the inventory and certification panels here — the kit
   * reaching down into the domain code that is supposed to consume it. The
   * caller already knows which panel it wants and already owns the assign call,
   * so it passes both.
   */
  renderPanel: (
    args: EntityLinkPickerPanelArgs<TCatalog, TAssigned>,
  ) => ReactNode;
}

export interface EntityLinkPickerPanelArgs<
  TCatalog extends { id?: number | null },
  TAssigned extends { id?: number | null },
> {
  catalog: TCatalog[];
  isCatalogLoading: boolean;
  assigned: TAssigned[];
  /** Ids currently linked — for the panel's checked state. */
  assignedIds: Set<number>;
  /** Unlink by id, then refresh the assigned list. */
  onUnlink: (id: number) => void;
  /** Call after a successful assign so the linked list refreshes. */
  refetchAssigned: () => Promise<unknown>;
}

export type EntityLinkPickerProps<
  TCatalog extends { id?: number | null },
  TAssigned extends { id?: number | null },
> = EntityLinkPickerCommonProps<TCatalog, TAssigned>;

export function EntityLinkPicker<
  TCatalog extends { id?: number | null },
  TAssigned extends { id?: number | null },
>(props: EntityLinkPickerProps<TCatalog, TAssigned>) {
  const {
    triggerLabel,
    triggerIcon: TriggerIcon = Plus,
    dialogTitle,
    dialogDescription,
    disabled,
    useCatalog,
    useAssigned,
    unassign,
    counter = "text",
    counterNoun = "item",
    renderPanel,
  } = props;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const { data: catalog = [], isLoading: isLoadingCatalog } =
    useCatalog(hasRequested);
  const {
    data: assigned = [],
    isLoading: isLoadingAssigned,
    refetch: refetchAssigned,
  } = useAssigned(hasRequested);

  const assignedIds = useMemo(
    () =>
      new Set(
        assigned
          .map((item) => item.id)
          .filter((id): id is number => typeof id === "number"),
      ),
    [assigned],
  );

  const handleRemove = async (id: number) => {
    await unassign(id);
    await refetchAssigned();
  };

  const panelBody = renderPanel({
    catalog,
    isCatalogLoading: isLoadingCatalog,
    assigned,
    assignedIds,
    onUnlink: (id) => void handleRemove(id),
    refetchAssigned,
  });

  return (
    <div
      data-testid="entity-link-picker"
      className="flex min-w-0 flex-wrap items-center gap-1.5"
    >
      {!hasRequested ? (
        <span className="text-xs italic text-muted-foreground">
          Open to load
        </span>
      ) : isLoadingAssigned || isLoadingCatalog ? (
        <span className="text-xs text-muted-foreground">Loading…</span>
      ) : counter === "badge" && assigned.length > 0 ? (
        <Badge
          variant="outline"
          className="gap-1 rounded-full border-border bg-card font-normal text-card-foreground"
        >
          <PackageIcon className="h-3 w-3 text-muted-foreground" />
          {assigned.length} {counterNoun}
          {assigned.length === 1 ? "" : "s"}
        </Badge>
      ) : counter === "badge" ? (
        <span className="text-xs italic text-muted-foreground">
          Open to load
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {assigned.length} linked
        </span>
      )}

      {!disabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6 shrink-0"
            title={triggerLabel}
            aria-label={triggerLabel}
            onClick={() => {
              if (!hasRequested) setHasRequested(true);
              setIsDialogOpen(true);
            }}
          >
            <TriggerIcon className="h-3.5 w-3.5" />
          </Button>

          <AppDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            size="xl"
            padding="flush"
            scrollBody
          >
            <AppDialogHeader
              title={dialogTitle}
              description={dialogDescription}
              sticky
            />
            <AppDialogBody>{panelBody}</AppDialogBody>
          </AppDialog>
        </>
      ) : null}
    </div>
  );
}
