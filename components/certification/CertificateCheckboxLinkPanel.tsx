"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { LinkPicker } from "@/components/shared/dialog/picker/LinkPicker";
import type { CertificateTemplate } from "@/services/program.service";
import type { LevelCertificateTemplate } from "@/services/certificate-template-level.service";

interface CertificateCheckboxLinkPanelProps {
  /** Templates already attached. Rendered as a "Linked templates" badge row above the picker. */
  linkedItems?: LevelCertificateTemplate[];
  /** Template ids already attached. Always required so we can filter the catalog. */
  linkedTemplateIds: Set<number>;
  /** The program's full template pool. */
  catalogItems: CertificateTemplate[];
  isCatalogLoading: boolean;
  /** Emits the selected template ids. */
  onSave: (templateIds: number[]) => Promise<void>;
  /** Called when the user clicks the "x" on a linked-template badge (if linkedItems supplied). */
  onUnlink?: (item: LevelCertificateTemplate) => void;
  /** Title above the linked badges. Default "Linked templates". */
  linkedTitle?: React.ReactNode;
  /** Title above the "add" card. Default "Add certificate templates". */
  addTitle?: React.ReactNode;
  className?: string;
}

export function CertificateCheckboxLinkPanel({
  linkedItems,
  linkedTemplateIds,
  catalogItems,
  isCatalogLoading,
  onSave,
  onUnlink,
  linkedTitle = "Linked templates",
  addTitle = "Add certificate templates",
  className,
}: CertificateCheckboxLinkPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const available = useMemo(
    () =>
      catalogItems.filter(
        (item) => item.id != null && !linkedTemplateIds.has(item.id),
      ),
    [catalogItems, linkedTemplateIds],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (item) =>
        String(item.name ?? "").toLowerCase().includes(q) ||
        String(item.certificateTitle ?? "").toLowerCase().includes(q) ||
        String(item.issuerName ?? "").toLowerCase().includes(q),
    );
  }, [available, search]);

  const pendingCount = pendingIds.size;

  function toggleItem(id: number) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    if (pendingCount === 0) return;
    setIsSaving(true);
    try {
      await onSave([...pendingIds]);
      setPendingIds(new Set());
      setSearch("");
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <LinkPicker
      className={className}
      linked={
        linkedItems
          ? {
              items: linkedItems,
              getKey: (item) => item.id,
              getLabel: (item) => item.name || item.certificateTitle || "Untitled template",
              title: linkedTitle,
              onUnlink,
              emptyMessage: "No linked templates.",
            }
          : undefined
      }
      addTitle={addTitle}
      pendingCount={pendingCount}
      onSave={handleSave}
      isSaving={isSaving}
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Search by name, title, or issuer…",
      }}
      renderPending={() => (
        <div className="space-y-1.5">
          {[...pendingIds].map((id) => {
            const item = catalogItems.find((c) => c.id === id);
            if (!item) return null;
            return (
              <div
                key={id}
                className="flex items-start justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground">
                  {item.name || item.certificateTitle || "Untitled template"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleItem(id)}
                  aria-label={`Remove ${item.name || item.certificateTitle || "Untitled template"} from selection`}
                  className="shrink-0 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
      list={{
        items: filtered,
        isLoading: isCatalogLoading,
        getKey: (item) => item.id ?? -1,
        isChecked: (item) => item.id != null && pendingIds.has(item.id),
        onToggle: (item) => {
          if (item.id != null) toggleItem(item.id);
        },
        emptyMessage:
          available.length === 0
            ? "All templates are already linked."
            : "No templates match your search.",
        renderRow: (item, checked) => (
          <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
            <Checkbox
              checked={checked}
              onCheckedChange={() => {
                if (item.id != null) toggleItem(item.id);
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-card-foreground">
                {item.name || item.certificateTitle || "Untitled template"}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                {item.certificateTitle ? <span>{item.certificateTitle}</span> : null}
                {item.issuerName ? <span>{item.issuerName}</span> : null}
              </div>
            </div>
            {checked ? (
              <span className="shrink-0 text-[10px] text-muted-foreground">Added</span>
            ) : item.isActive === false ? (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Inactive
              </Badge>
            ) : null}
          </label>
        ),
      }}
    />
  );
}
