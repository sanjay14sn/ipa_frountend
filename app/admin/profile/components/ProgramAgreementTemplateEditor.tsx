"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-utils";
import {
  getProcessedAgreementContent,
  type AgreementContent,
  type AgreementPoint,
  type AgreementSection,
} from "@/lib/agreementContent";
import {
  getProgramAgreementTemplate,
  saveProgramAgreementTemplate,
  type AgreementTemplateKind,
} from "@/services/agreement-template.service";

// Tokens that can be inserted into a point's text. Resolved server-side at
// signing and client-side for the preview pane.
const TOKENS: string[] = [
  "franchisorName",
  "franchisorAddress",
  "franchiseeName",
  "franchiseeAddress",
  "centreName",
  "centreAddress",
  "effectiveDate",
  "validTill",
  "tenureYears",
  "tenureMonths",
  "franchiseFee",
  "gstClause",
  "registrationCharges",
  "materialChargePerLevel",
  "l1TermFee",
  "l1FranchiseeShare",
  "l1CiShare",
  "l1IpaShare",
  "l2TermFee",
  "l2FranchiseeShare",
  "l2CiShare",
  "l2IpaShare",
  "renewalFee",
  "targetRoyalty",
  "priorAgreementDate",
  "priorAgreementExpiry",
  "priorCentre",
  "royaltyPerChild",
  "materialCostPerLevel",
  "bankAccountNo",
  "franchiseeShareFourMonth",
  "franchiseeShareThreeMonth",
  "instructorShareFourMonth",
  "instructorShareThreeMonth",
  "franchisorAdminFourMonth",
  "franchisorAdminThreeMonth",
  "quarterlySalesQuota",
];

// Small franchiseData-like object used only to render the live preview. Values
// are illustrative — they let the {token} placeholders resolve to something
// readable without touching real franchise data.
const SAMPLE_FRANCHISE_DATA = {
  name: "Sample Abacus Centre",
  contactPerson: "Jane Franchisee",
  franchiseeName: "Jane Franchisee",
  franchisorName: "Ideal Play Abacus India Pvt. Ltd",
  centreName: "Sample Abacus Centre",
  effectiveDate: new Date(),
  validTill: new Date(),
  tenureYears: 3,
  tenureMonths: 36,
  expiryDate: new Date().toISOString(),
  paymentDetails: [
    {
      franchiseFee: 50000,
      gstFranchiseFee: false,
      royalty: 30,
      franchiseShare: 60,
      ciShare: 10,
      installments: 1,
      royaltyGst: false,
    },
  ],
} as const;

const EMPTY_CONTENT: AgreementContent = {
  title: "",
  description: "",
  sections: [],
};

const KIND_TABS: { value: AgreementTemplateKind; label: string }[] = [
  { value: "INITIAL", label: "Initial" },
  { value: "RENEWAL", label: "Renewal" },
];

// Matches a single `{token}` placeholder anywhere in a point's text.
const TOKEN_PATTERN = /\{[a-zA-Z0-9_]+\}/g;

/** A point is "dynamic" when its text contains at least one `{token}`. */
function hasTokens(text: string): boolean {
  return /\{[a-zA-Z0-9_]+\}/.test(text);
}

/** Count of distinct `{tokens}` in a point's text (for the auto-fill badge). */
function distinctTokenCount(text: string): number {
  const matches = text.match(TOKEN_PATTERN);
  if (!matches) return 0;
  return new Set(matches).size;
}

function nextSectionId(): string {
  return `section-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function nextPointId(): string {
  return `point-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** Re-number sections so `order` is contiguous (1..n) in array order. */
function withContiguousOrder(sections: AgreementSection[]): AgreementSection[] {
  return sections.map((section, index) => ({ ...section, order: index + 1 }));
}

/** Re-derive every point's `dynamic` flag from whether its text has tokens. */
function withDerivedDynamic(content: AgreementContent): AgreementContent {
  return {
    ...content,
    sections: content.sections.map((section) => ({
      ...section,
      points: section.points.map((point) => ({
        ...point,
        dynamic: hasTokens(point.text),
      })),
    })),
  };
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

interface ProgramAgreementTemplateEditorProps {
  programId: number;
}

export function ProgramAgreementTemplateEditor({
  programId,
}: ProgramAgreementTemplateEditorProps) {
  const [kind, setKind] = useState<AgreementTemplateKind>("INITIAL");
  const [content, setContent] = useState<AgreementContent>(EMPTY_CONTENT);
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sections are collapsed by default so the editor opens as a navigable
  // outline. We track the *expanded* ids; anything not in the set is collapsed.
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Track the most recently focused point textarea so token chips know where to
  // insert. Stored as a stable composite key `${sectionId}:${pointId}`.
  const focusedPointKeyRef = useRef<string | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const load = useCallback(
    async (which: AgreementTemplateKind) => {
      setLoading(true);
      try {
        const template = await getProgramAgreementTemplate(programId, which);
        if (template?.content) {
          setContent({
            ...template.content,
            sections: withContiguousOrder(
              [...template.content.sections].sort((a, b) => a.order - b.order),
            ),
          });
          setVersion(template.version);
        } else {
          setContent(EMPTY_CONTENT);
          setVersion(null);
        }
        // Reset to the outline view whenever a template (re)loads.
        setExpandedSectionIds(new Set());
      } catch (e) {
        toast.error(getErrorMessage(e, "Failed to load agreement template"));
        setContent(EMPTY_CONTENT);
        setVersion(null);
        setExpandedSectionIds(new Set());
      } finally {
        setLoading(false);
      }
    },
    [programId],
  );

  useEffect(() => {
    void load(kind);
  }, [kind, load]);

  function handleKindChange(value: string) {
    setKind(value as AgreementTemplateKind);
  }

  // ── collapse / expand ────────────────────────────────────────────────────────

  function toggleSection(sectionId: string) {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function expandAll() {
    setExpandedSectionIds(new Set(content.sections.map((s) => s.id)));
  }

  function collapseAll() {
    setExpandedSectionIds(new Set());
  }

  // ── content mutators ───────────────────────────────────────────────────────

  function updateContent(patch: Partial<AgreementContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }

  function updateSection(sectionId: string, patch: Partial<AgreementSection>) {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...patch } : s,
      ),
    }));
  }

  function addSection() {
    const id = nextSectionId();
    setContent((prev) => ({
      ...prev,
      sections: withContiguousOrder([
        ...prev.sections,
        {
          id,
          title: "New Section",
          description: "",
          order: prev.sections.length + 1,
          points: [],
        },
      ]),
    }));
    // A freshly added section opens expanded so it can be filled in.
    setExpandedSectionIds((prev) => new Set(prev).add(id));
  }

  function removeSection(sectionId: string) {
    setContent((prev) => ({
      ...prev,
      sections: withContiguousOrder(
        prev.sections.filter((s) => s.id !== sectionId),
      ),
    }));
    setExpandedSectionIds((prev) => {
      if (!prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  }

  function moveSection(index: number, direction: -1 | 1) {
    setContent((prev) => ({
      ...prev,
      sections: withContiguousOrder(
        moveItem(prev.sections, index, index + direction),
      ),
    }));
  }

  function updatePoint(
    sectionId: string,
    pointId: string,
    patch: Partial<AgreementPoint>,
  ) {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              points: s.points.map((p) => {
                if (p.id !== pointId) return p;
                const merged = { ...p, ...patch };
                // Keep `dynamic` in lock-step with the text so the persisted
                // metadata and the live preview always match real output.
                if (patch.text !== undefined) {
                  merged.dynamic = hasTokens(patch.text);
                }
                return merged;
              }),
            }
          : s,
      ),
    }));
  }

  function addPoint(sectionId: string) {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              points: [
                ...s.points,
                { id: nextPointId(), text: "", dynamic: false },
              ],
            }
          : s,
      ),
    }));
    // Make sure the section is open so the new point is visible.
    setExpandedSectionIds((prev) => new Set(prev).add(sectionId));
  }

  function removePoint(sectionId: string, pointId: string) {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, points: s.points.filter((p) => p.id !== pointId) }
          : s,
      ),
    }));
  }

  function movePoint(sectionId: string, index: number, direction: -1 | 1) {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, points: moveItem(s.points, index, index + direction) }
          : s,
      ),
    }));
  }

  // ── token insertion ─────────────────────────────────────────────────────────

  function insertToken(token: string) {
    const key = focusedPointKeyRef.current;
    if (!key) {
      toast.info("Click into a point's text first, then pick a token.");
      return;
    }
    const [sectionId, pointId] = key.split(":");
    const section = content.sections.find((s) => s.id === sectionId);
    const point = section?.points.find((p) => p.id === pointId);
    if (!point) return;

    const snippet = `{${token}}`;
    const textarea = textareaRefs.current.get(key);
    let nextText: string;
    if (textarea) {
      const start = textarea.selectionStart ?? point.text.length;
      const end = textarea.selectionEnd ?? point.text.length;
      nextText = point.text.slice(0, start) + snippet + point.text.slice(end);
    } else {
      // No live cursor — append.
      nextText = point.text ? `${point.text} ${snippet}` : snippet;
    }
    // `dynamic` is auto-derived from the new text inside updatePoint.
    updatePoint(sectionId, pointId, { text: nextText });

    // Restore focus + caret just after the inserted token.
    if (textarea) {
      const caret =
        (textarea.selectionStart ?? point.text.length) + snippet.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      });
    }
  }

  // ── save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      // Persist contiguous order and freshly derived `dynamic` flags so the
      // saved data is always consistent with the clause text.
      const payload: AgreementContent = withDerivedDynamic({
        ...content,
        sections: withContiguousOrder(content.sections),
      });
      const saved = await saveProgramAgreementTemplate(programId, kind, payload);
      toast.success(`Agreement template saved (v${saved.version})`);
      await load(kind);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to save agreement template"));
    } finally {
      setSaving(false);
    }
  }

  // ── preview ──────────────────────────────────────────────────────────────────

  const preview = useMemo(() => {
    try {
      return getProcessedAgreementContent(SAMPLE_FRANCHISE_DATA, content);
    } catch {
      return content;
    }
  }, [content]);

  const orderedSections = useMemo(
    () => [...content.sections].sort((a, b) => a.order - b.order),
    [content.sections],
  );

  const busy = loading || saving;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Editor column ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Sticky action toolbar — stays reachable while the form scrolls.
            Scoped to the editor column so it never overlaps the app nav or
            the preview pane. */}
        <div className="sticky top-0 z-20 -mx-1 border-b bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={kind} onValueChange={handleKindChange}>
                <TabsList>
                  {KIND_TABS.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {loading ? (
                <span className="text-xs text-muted-foreground">Loading…</span>
              ) : version != null ? (
                <Badge variant="secondary" className="font-mono">
                  v{version}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  No template yet
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={expandAll}
                disabled={orderedSections.length === 0}
                title="Expand all sections"
              >
                Expand all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                disabled={orderedSections.length === 0}
                title="Collapse all sections"
              >
                Collapse all
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void load(kind)}
                disabled={busy}
                title="Reload from server (discards unsaved changes)"
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
                />
                Reload
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={busy}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save new version
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="agreement-title">Title</Label>
              <Input
                id="agreement-title"
                value={content.title}
                onChange={(e) => updateContent({ title: e.target.value })}
                placeholder="Agreement title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agreement-description">Description</Label>
              <Textarea
                id="agreement-description"
                value={content.description}
                onChange={(e) => updateContent({ description: e.target.value })}
                placeholder="Short description shown above the clauses"
                className="min-h-[60px]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">
            Sections ({orderedSections.length})
          </h3>
          <div className="flex items-center gap-2">
            {/* Token palette lives in a popover so it's reachable from any
                point without scrolling, while still inserting into the most
                recently focused textarea. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Tokens
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <p className="mb-2 text-xs text-muted-foreground">
                  Click into a point&apos;s text, then click a token to insert
                  it. Points with tokens auto-fill from franchise data.
                </p>
                <ScrollArea className="h-64 pr-3">
                  <div className="flex flex-wrap gap-1.5">
                    {TOKENS.map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => insertToken(token)}
                        className="rounded-md border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {`{${token}}`}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSection}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add section
            </Button>
          </div>
        </div>

        {orderedSections.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No sections yet. Add one to start building the agreement.
          </div>
        ) : (
          orderedSections.map((section, sectionIndex) => {
            const isOpen = expandedSectionIds.has(section.id);
            return (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-8 w-8 shrink-0 p-0"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Collapse section" : "Expand section"}
                      title={isOpen ? "Collapse section" : "Expand section"}
                    >
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    </Button>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={section.title}
                        onChange={(e) =>
                          updateSection(section.id, { title: e.target.value })
                        }
                        placeholder="Section title"
                        className="font-medium"
                      />
                      {!isOpen ? (
                        <p className="text-xs text-muted-foreground">
                          {section.points.length}{" "}
                          {section.points.length === 1 ? "point" : "points"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => moveSection(sectionIndex, -1)}
                        disabled={sectionIndex === 0}
                        aria-label="Move section up"
                        title="Move section up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => moveSection(sectionIndex, 1)}
                        disabled={sectionIndex === orderedSections.length - 1}
                        aria-label="Move section down"
                        title="Move section down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => removeSection(section.id)}
                        aria-label="Remove section"
                        title="Remove section"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isOpen ? (
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Section description
                      </Label>
                      <Textarea
                        value={section.description ?? ""}
                        onChange={(e) =>
                          updateSection(section.id, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Optional section description"
                        className="min-h-[44px]"
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Points ({section.points.length})
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPoint(section.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add point
                      </Button>
                    </div>
                    {section.points.map((point, pointIndex) => {
                      const key = `${section.id}:${point.id}`;
                      const tokenCount = distinctTokenCount(point.text);
                      return (
                        <div
                          key={point.id}
                          className="space-y-2 rounded-lg border bg-muted/30 p-3"
                        >
                          <Textarea
                            ref={(el) => {
                              if (el) textareaRefs.current.set(key, el);
                              else textareaRefs.current.delete(key);
                            }}
                            value={point.text}
                            onFocus={() => {
                              focusedPointKeyRef.current = key;
                            }}
                            onChange={(e) =>
                              updatePoint(section.id, point.id, {
                                text: e.target.value,
                              })
                            }
                            placeholder="Clause text. Use the token palette to insert dynamic values."
                            className="min-h-[88px] leading-relaxed"
                          />
                          <div className="flex items-center justify-between gap-2">
                            {tokenCount > 0 ? (
                              <Badge
                                variant="secondary"
                                className="gap-1 font-normal text-muted-foreground"
                                title="This clause auto-fills from franchise data"
                              >
                                <RotateCw className="h-3 w-3" />
                                auto-fills {tokenCount}{" "}
                                {tokenCount === 1 ? "field" : "fields"}
                              </Badge>
                            ) : (
                              <span />
                            )}
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  movePoint(section.id, pointIndex, -1)
                                }
                                disabled={pointIndex === 0}
                                aria-label="Move point up"
                                title="Move point up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  movePoint(section.id, pointIndex, 1)
                                }
                                disabled={
                                  pointIndex === section.points.length - 1
                                }
                                aria-label="Move point down"
                                title="Move point down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => removePoint(section.id, point.id)}
                                aria-label="Remove point"
                                title="Remove point"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {section.points.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No points in this section yet.
                      </p>
                    ) : null}
                  </CardContent>
                ) : null}
              </Card>
            );
          })
        )}
      </div>

      {/* ── Preview column ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <Card className="lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live preview</CardTitle>
            <p className="text-xs text-muted-foreground">
              Tokens are resolved with sample franchise data for illustration
              only.
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {preview.title || "Untitled agreement"}
                  </h2>
                  {preview.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {preview.description}
                    </p>
                  ) : null}
                </div>
                {preview.sections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                    {section.description ? (
                      <p className="text-xs text-muted-foreground">
                        {section.description}
                      </p>
                    ) : null}
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {section.points.map((point) => (
                        <li key={point.id} className="whitespace-pre-wrap">
                          {point.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {preview.sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing to preview yet.
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
