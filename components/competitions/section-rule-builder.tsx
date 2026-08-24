"use client";

import React from "react";
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Lock,
  Plus,
  Trash2,
  Trophy,
  Undo2,
  AlertCircle,
} from "lucide-react";
import type { CompositionMode, PaperSectionRules, PatternSelectionMode, SectionType } from "@/lib/paper-section-rules.types";
import {
  DIGIT_TYPE_OPTIONS,
  formCompositionPatterns,
  formDigitComposition,
  addCompositionPattern,
  applySectionTypeChange,
  compositionGroupTotal,
  defaultRangeForDigits,
  digitLabel,
  effectiveQuestions,
  effectiveRows,
  effectiveTime,
  formatCompositionSummary,
  formatOperationsSummary,
  formatPatternExample,
  formatPatternSelectionLabel,
  isSectionEditable,
  patternIsValid,
  removeCompositionPattern,
  setCompositionMode,
  setPatternSelection,
  switchRuleSource,
  uniformGroups,
  updateCompositionPatternGroup,
  updatePatternWeight,
  updateRowsOnSection,
  estimateSectionUniqueCapacity,
  repairSectionForGeneration,
  describeSectionRepairAction,
  sectionNeedsRowRepair,
  syncModelSnapshot,
  validateSectionRules,
} from "@/lib/paper-section-rules.utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SectionRuleBuilderProps {
  section: PaperSectionRules;
  onChange: (section: PaperSectionRules) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  /** When true (admin rules editor), fields stay editable; edits auto-switch to Custom Override. */
  alwaysEditable?: boolean;
  /** Global allow-duplicates flag for capacity warnings. */
  allowDuplicates?: boolean;
  /** When true (uniform time mode), hide per-section time fields. */
  hideSectionTime?: boolean;
}

function FieldShell({
  label,
  modelHint,
  editable,
  children,
}: {
  label: string;
  modelHint?: string | number;
  editable: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">{label}</Label>
      {children}
      {!editable && modelHint !== undefined && (
        <p className="text-[9px] text-muted-foreground">Model default: {modelHint}</p>
      )}
    </div>
  );
}

export function SectionRuleBuilder({
  section,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  alwaysEditable = false,
  allowDuplicates = false,
  hideSectionTime = false,
}: SectionRuleBuilderProps) {
  const editable = alwaysEditable || isSectionEditable(section);
  const isModelLocked = !editable;
  const isMental = section.type === "Mental/Zhusuan";
  const isMult = section.type === "Multiplication";
  const isDiv = section.type === "Division";
  const rows = effectiveRows(section);
  const composition = formDigitComposition(section, alwaysEditable);
  const compositionPatterns = formCompositionPatterns(section, alwaysEditable);
  const validation = validateSectionRules(section, { allowDuplicates });
  const capacity = estimateSectionUniqueCapacity(section);
  const needsRepair = sectionNeedsRowRepair(section, allowDuplicates);

  const commit = (next: PaperSectionRules) => {
    onChange(next);
  };

  /** Promote to Custom Override before applying a structural change. */
  const commitChange = (updater: (base: PaperSectionRules) => PaperSectionRules) => {
    if (alwaysEditable) {
      commit(syncModelSnapshot(updater(section)));
      return;
    }
    const base = section.ruleSource === "model" ? switchRuleSource(section, "override") : section;
    commit(updater(base));
  };

  /** Any field edit in model mode auto-promotes to Custom Override. */
  const withOverride = (fields: Partial<PaperSectionRules> = {}): PaperSectionRules => {
    if (alwaysEditable) {
      return syncModelSnapshot({ ...section, ...fields });
    }
    if (section.ruleSource === "model" && Object.keys(fields).length > 0) {
      return { ...switchRuleSource(section, "override"), ...fields };
    }
    return { ...section, ...fields };
  };

  const patch = (fields: Partial<PaperSectionRules>) => {
    commit(withOverride(fields));
  };

  const patchMult = (fields: Partial<NonNullable<PaperSectionRules["multiplication"]>>) => {
    commit(
      withOverride({
        multiplication: { ...(section.multiplication ?? {}), ...fields } as PaperSectionRules["multiplication"],
      }),
    );
  };

  const patchDiv = (fields: Partial<NonNullable<PaperSectionRules["division"]>>) => {
    commit(
      withOverride({
        division: { ...(section.division ?? {}), ...fields } as PaperSectionRules["division"],
      }),
    );
  };

  const enableOverride = () => {
    if (section.ruleSource !== "override") {
      commit(switchRuleSource(section, "override"));
    }
  };

  const toggleOp = (op: string) => {
    if (!editable || !isMental) return;
    const ops = section.ops.includes(op) ? section.ops.filter((o) => o !== op) : [...section.ops, op];
    patch({ ops: ops.length ? ops : [op] });
  };

  const updateCompositionGroups = (
    digitType: number,
    field: "count" | "min" | "max",
    value: number,
  ) => {
    const groups = (composition.groups ?? []).map((g) =>
      g.digits === digitType ? { ...g, [field]: value } : g,
    );
    patch({
      digitComposition: { ...composition, groups },
    });
  };

  const renderNumberField = (
    label: string,
    value: number | string,
    modelValue: number | string,
    onSave: (val: number | string) => void,
    type: "number" | "text" = "number",
  ) => (
    <FieldShell label={label} modelHint={modelValue} editable={editable}>
      {editable ? (
        <div className="space-y-1">
          <Input
            type={type}
            value={value}
            onChange={(e) => onSave(type === "number" ? Number(e.target.value) : e.target.value)}
            className="h-8 text-xs font-semibold rounded-md border-blue-200 focus:border-blue-500"
          />
          <div className="text-[9px] text-slate-400 flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 py-0.5 px-1 rounded-sm w-max">
            <span>Model: {modelValue}</span>
            <button type="button" onClick={() => onSave(modelValue)} className="text-blue-500 hover:text-blue-600">
              <Undo2 className="h-2 w-2" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={enableOverride}
          className="relative w-full rounded-md text-left transition-colors hover:ring-2 hover:ring-blue-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Click to switch to Custom Override and edit"
        >
          <Input
            readOnly
            value={modelValue}
            className="h-8 text-xs bg-slate-100 text-slate-500 rounded-md font-mono cursor-pointer pl-7 pointer-events-none"
          />
          <Lock className="absolute left-2 top-2 h-4 w-4 text-slate-400" />
          <p className="text-[9px] text-blue-600 font-semibold mt-1">Click field to enable editing</p>
        </button>
      )}
    </FieldShell>
  );

  return (
    <Card
      className="border border-slate-200/60 dark:border-slate-800 shadow-none bg-slate-50/20 dark:bg-slate-950/20 rounded-xl overflow-hidden"
      data-testid={`section-rule-builder-${section.name}`}
    >
      <div className="bg-slate-50 dark:bg-slate-900/50 py-3 px-4 border-b border-slate-200/40 flex justify-between items-center gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 text-white font-black text-[10px] font-mono">
            {section.name}
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Section Properties</span>
          <Badge
            className={`border-0 text-[9px] uppercase tracking-wider font-bold py-0.5 px-2 ${
              isMental
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400"
                : isMult
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400"
            }`}
          >
            {section.type}
          </Badge>
          {section.ruleSource === "model" && (
            <Badge variant="outline" className="text-[9px]">Model defaults</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveUp} onClick={onMoveUp}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
          {onMoveDown && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveDown} onClick={onMoveDown}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-5 space-y-5 bg-white dark:bg-slate-900/40">
        {/* Section Type */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Section Type</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                { value: "Mental/Zhusuan" as SectionType, label: "Mental / Zhusuan", desc: "+ / - math rows", icon: Layers, color: "blue" },
                { value: "Multiplication" as SectionType, label: "Multiplication", desc: "× arithmetic", icon: Trophy, color: "emerald" },
                { value: "Division" as SectionType, label: "Division", desc: "÷ arithmetic", icon: BookOpen, color: "purple" },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const isSelected = section.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => commitChange((base) => applySectionTypeChange(base, t.value))}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all duration-150 ${
                    isSelected
                      ? t.color === "blue"
                        ? "border-blue-500 bg-blue-50/20 text-blue-900 ring-1 ring-blue-500/20"
                        : t.color === "emerald"
                          ? "border-emerald-500 bg-emerald-50/20 text-emerald-900 ring-1 ring-emerald-500/20"
                          : "border-purple-500 bg-purple-50/20 text-purple-900 ring-1 ring-purple-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500"
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1.5" />
                  <span className="text-xs font-bold block">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rule Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50/80 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Rule Mode</Label>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {alwaysEditable
                ? "Edit any field directly — changes auto-switch to Custom Override. Use Model Paper Rule to revert to saved defaults."
                : "Model loads saved JSON defaults. Custom Override enables full editing."}
            </span>
          </div>
          <div className="flex bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg w-full max-w-[280px] ml-auto">
            <button
              type="button"
              onClick={() => commit(switchRuleSource(section, "model"))}
              className={`flex-1 text-center py-1.5 text-[11px] font-bold rounded-md transition-all ${
                section.ruleSource === "model" ? "bg-white shadow-xs text-slate-900" : "text-slate-500"
              }`}
            >
              Model Paper Rule
            </button>
            <button
              type="button"
              onClick={() => commit(switchRuleSource(section, "override"))}
              className={`flex-1 text-center py-1.5 text-[11px] font-bold rounded-md transition-all ${
                section.ruleSource === "override" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500"
              }`}
            >
              Custom Override
            </button>
          </div>
        </div>

        {isModelLocked && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <div className="flex items-start gap-2 flex-1">
              <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Fields are locked</p>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80">
                  Model Paper Rule shows saved defaults as read-only. Switch to Custom Override to edit questions, rows, digits, and operations.
                </p>
              </div>
            </div>
            <Button type="button" size="sm" className="h-8 text-xs shrink-0" onClick={enableOverride}>
              Enable Custom Override
            </Button>
          </div>
        )}

        {/* Questions / Rows / Time */}
        <div className={`grid gap-4 border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/40 ${isMental ? (hideSectionTime ? "grid-cols-2" : "grid-cols-3") : hideSectionTime ? "grid-cols-1" : "grid-cols-2"}`}>
          {renderNumberField(
            "Questions",
            editable ? section.questions : section.modelQuestions,
            section.modelQuestions,
            (val) => patch({ questions: Number(val) }),
          )}
          {isMental &&
            renderNumberField(
              "Rows/Question",
              editable ? rows : section.modelRows,
              section.modelRows,
              (val) => commitChange((base) => updateRowsOnSection(base, Number(val))),
            )}
          {!hideSectionTime &&
            renderNumberField("Time (Mins)", editable ? section.time : section.modelTime, section.modelTime, (val) => patch({ time: String(val) }), "text")}
        </div>

        {/* Mental rules */}
        {isMental && (
          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldShell label="Operations" editable={editable}>
                <div className="flex gap-4 mt-1">
                  <Label className="flex items-center gap-2 font-normal cursor-pointer select-none">
                    <Checkbox checked={section.ops.includes("+")} disabled={!editable} onCheckedChange={() => toggleOp("+")} />
                    <span className="text-xs font-bold">Addition (+)</span>
                  </Label>
                  <Label className="flex items-center gap-2 font-normal cursor-pointer select-none">
                    <Checkbox checked={section.ops.includes("-")} disabled={!editable} onCheckedChange={() => toggleOp("-")} />
                    <span className="text-xs font-bold">Subtraction (-)</span>
                  </Label>
                </div>
              </FieldShell>

              <FieldShell label="Composition Mode" editable={editable}>
                <Select
                  value={composition.mode}
                  disabled={!editable}
                  onValueChange={(val) => commitChange((base) => setCompositionMode(base, val as CompositionMode))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="model">Model Paper Pattern</SelectItem>
                    <SelectItem value="uniform">Uniform</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
            </div>

            {composition.mode === "uniform" && (
              <FieldShell label="Digit Type" editable={editable}>
                <Select
                  value={String(composition.uniformDigitType ?? 1)}
                  disabled={!editable}
                  onValueChange={(val) => {
                    const digitType = Number(val);
                    const nextGroups = uniformGroups(digitType, rows);
                    patch({
                      digitComposition: {
                        ...composition,
                        mode: "uniform",
                        uniformDigitType: digitType,
                        groups: nextGroups,
                      },
                      minRange: nextGroups[0]?.min,
                      maxRange: nextGroups[0]?.max,
                      numType: digitLabel(digitType),
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIGIT_TYPE_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {digitLabel(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
            )}

            {composition.mode === "mixed" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600">Digit Composition</Label>
                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 bg-slate-100 px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">
                    <span>Digit Type</span>
                    <span>Count</span>
                    <span>Minimum</span>
                    <span>Maximum</span>
                  </div>
                  {(composition.groups ?? []).map((group) => (
                    <div key={group.digits} className="grid grid-cols-4 gap-2 px-3 py-2 border-t text-xs items-center">
                      <span className="font-mono font-semibold">{digitLabel(group.digits)}</span>
                      <Input
                        type="number"
                        min={0}
                        disabled={!editable}
                        value={group.count}
                        onChange={(e) => updateCompositionGroups(group.digits, "count", Number(e.target.value))}
                        className="h-7 text-xs"
                      />
                      <Input
                        type="number"
                        disabled={!editable}
                        value={group.min}
                        onChange={(e) => updateCompositionGroups(group.digits, "min", Number(e.target.value))}
                        className="h-7 text-xs"
                      />
                      <Input
                        type="number"
                        disabled={!editable}
                        value={group.max}
                        onChange={(e) => updateCompositionGroups(group.digits, "max", Number(e.target.value))}
                        className="h-7 text-xs"
                      />
                    </div>
                  ))}
                </div>
                <p className={`text-[10px] font-semibold ${patternIsValid(composition.groups ?? [], rows) ? "text-emerald-600" : "text-rose-600"}`}>
                  {patternIsValid(composition.groups ?? [], rows)
                    ? `✓ Valid composition (${rows} rows)`
                    : `Composition total must equal ${rows} rows`}
                </p>
              </div>
            )}

            {composition.mode === "model" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-bold text-slate-600">Allowed Digit Composition Patterns</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!editable}
                    onClick={() => commit(addCompositionPattern(section))}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Composition Pattern
                  </Button>
                </div>

                <div className="space-y-3">
                  {compositionPatterns.map((pattern, patternIndex) => {
                    const patternTotal = compositionGroupTotal(pattern.groups);
                    const valid = patternIsValid(pattern.groups, rows);
                    return (
                      <div
                        key={pattern.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {pattern.name ?? `Pattern ${patternIndex + 1}`}
                          </span>
                          {compositionPatterns.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                              disabled={!editable}
                              onClick={() => commit(removeCompositionPattern(section, pattern.id))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                          <div className="space-y-2">
                            {pattern.groups.map((group) => (
                              <div key={group.digits} className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold w-16 shrink-0">{digitLabel(group.digits)}</span>
                                <Input
                                  type="number"
                                  min={0}
                                  disabled={!editable}
                                  value={group.count}
                                  onChange={(e) =>
                                    commit(
                                      updateCompositionPatternGroup(
                                        section,
                                        pattern.id,
                                        group.digits,
                                        "count",
                                        Number(e.target.value),
                                      ),
                                    )
                                  }
                                  className="h-8 text-xs font-mono max-w-[88px]"
                                />
                              </div>
                            ))}
                            <p className={`text-[10px] font-semibold pt-1 ${valid ? "text-emerald-600" : "text-rose-600"}`}>
                              {valid ? `Total: ${patternTotal} / ${rows} ✓` : `Total: ${patternTotal} / ${rows} — must equal ${rows}`}
                            </p>
                          </div>

                          <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-dashed p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Example</p>
                            <pre className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {formatPatternExample(pattern.groups)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <FieldShell label="Pattern Selection" editable={editable}>
                  <Select
                    value={composition.patternSelection ?? "model"}
                    disabled={!editable}
                    onValueChange={(val) => commit(setPatternSelection(section, val as PatternSelectionMode))}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="model">Model Paper Distribution</SelectItem>
                      <SelectItem value="custom">Custom Distribution</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldShell>

                {composition.patternSelection === "custom" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {compositionPatterns.map((pattern, index) => (
                      <FieldShell
                        key={pattern.id}
                        label={`${pattern.name ?? `Pattern ${index + 1}`} weight (%)`}
                        editable={editable}
                      >
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!editable}
                          value={composition.customPatternWeights?.[index] ?? 0}
                          onChange={(e) => commit(updatePatternWeight(section, index, Number(e.target.value)))}
                          className="h-8 text-xs font-mono"
                        />
                      </FieldShell>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Each pattern defines one valid digit layout per question. The generator picks a pattern using the selection rule above. Digit position within rows is controlled separately below.
                </p>
              </div>
            )}

            {composition.mode === "uniform" && (
              <div className="grid grid-cols-2 gap-4">
                <FieldShell label="Number range minimum" editable={editable}>
                  <Input
                    type="number"
                    disabled={!editable}
                    value={composition.groups?.[0]?.min ?? defaultRangeForDigits(composition.uniformDigitType ?? 1).min}
                    onChange={(e) => {
                      const groups = uniformGroups(composition.uniformDigitType ?? 1, rows);
                      groups[0] = { ...groups[0], min: Number(e.target.value) };
                      patch({ digitComposition: { ...composition, groups }, minRange: Number(e.target.value) });
                    }}
                    className="h-8 text-xs"
                  />
                </FieldShell>
                <FieldShell label="Number range maximum" editable={editable}>
                  <Input
                    type="number"
                    disabled={!editable}
                    value={composition.groups?.[0]?.max ?? defaultRangeForDigits(composition.uniformDigitType ?? 1).max}
                    onChange={(e) => {
                      const groups = uniformGroups(composition.uniformDigitType ?? 1, rows);
                      groups[0] = { ...groups[0], max: Number(e.target.value) };
                      patch({ digitComposition: { ...composition, groups }, maxRange: Number(e.target.value) });
                    }}
                    className="h-8 text-xs"
                  />
                </FieldShell>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldShell label="Digit Position Pattern" editable={editable}>
                  <Select
                    value={section.digitPositionPattern}
                    disabled={!editable}
                    onValueChange={(val) => patch({ digitPositionPattern: val as PaperSectionRules["digitPositionPattern"] })}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="model">Model Paper Pattern</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldShell>
                <p className="text-[10px] text-muted-foreground px-0.5">
                  Randomizes where 1D / 2D / … digit widths appear across rows.
                </p>
              </div>

              <div className="space-y-1.5">
                <FieldShell label="Operation Pattern" editable={editable}>
                  <Select
                    value={section.operationPattern}
                    disabled={!editable}
                    onValueChange={(val) => patch({ operationPattern: val as PaperSectionRules["operationPattern"] })}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random Sequence</SelectItem>
                      <SelectItem value="model">Model Paper Pattern</SelectItem>
                      <SelectItem value="custom">Custom Sequence</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldShell>
                <p className="text-[10px] text-muted-foreground px-0.5">
                  Randomizes the + / − sequence between rows (independent of digit placement).
                </p>
              </div>
            </div>

            {section.digitPositionPattern === "fixed" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold">Fixed digit positions (per row)</Label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: rows }).map((_, idx) => (
                    <Select
                      key={idx}
                      value={String(section.fixedDigitPositions?.[idx] ?? 1)}
                      disabled={!editable}
                      onValueChange={(val) => {
                        const next = [...(section.fixedDigitPositions ?? Array(rows).fill(1))];
                        next[idx] = Number(val);
                        patch({ fixedDigitPositions: next });
                      }}
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue placeholder={`Row ${idx + 1}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {DIGIT_TYPE_OPTIONS.map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            Row {idx + 1}: {digitLabel(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
              </div>
            )}

            {(section.operationPattern === "custom" || section.operationPattern === "model") && (
              <FieldShell
                label={
                  section.operationPattern === "model"
                    ? "Model operation sequence"
                    : "Custom operation sequence"
                }
                editable={editable}
              >
                <Input
                  disabled={!editable}
                  value={section.customOperationPattern ?? ""}
                  onChange={(e) => patch({ customOperationPattern: e.target.value })}
                  placeholder="E.g. + - + -"
                  className="h-8 text-xs font-mono"
                />
              </FieldShell>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldShell label="First Number Sign" editable={editable}>
                <Select
                  value={section.firstNumberSign}
                  disabled={!editable}
                  onValueChange={(val) => patch({ firstNumberSign: val as PaperSectionRules["firstNumberSign"] })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Positive">Positive</SelectItem>
                    <SelectItem value="Negative">Negative</SelectItem>
                    <SelectItem value="Either">Either</SelectItem>
                    <SelectItem value="Model Paper Pattern">Model Paper Pattern</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Following Signs" editable={editable}>
                <Select
                  value={section.followingNumbersSign}
                  disabled={!editable}
                  onValueChange={(val) => patch({ followingNumbersSign: val as PaperSectionRules["followingNumbersSign"] })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Positive Only">Positive Only</SelectItem>
                    <SelectItem value="Negative Only">Negative Only</SelectItem>
                    <SelectItem value="Positive / Negative">Positive / Negative</SelectItem>
                    <SelectItem value="Model Paper Pattern">Model Paper Pattern</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Negative Frequency" editable={editable}>
                <Select
                  value={section.negativeFrequency}
                  disabled={!editable}
                  onValueChange={(val) => patch({ negativeFrequency: val as PaperSectionRules["negativeFrequency"] })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Random">Random</SelectItem>
                    <SelectItem value="Model Pattern">Model Pattern</SelectItem>
                    <SelectItem value="Custom Percentage">Custom Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
            </div>

            {section.negativeFrequency === "Custom Percentage" && (
              <FieldShell label="Negative Frequency (%)" editable={editable}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  disabled={!editable}
                  value={section.negativeFrequencyPercent ?? 0}
                  onChange={(e) => patch({ negativeFrequencyPercent: Number(e.target.value) })}
                  className="h-8 text-xs w-32"
                />
              </FieldShell>
            )}

          </div>
        )}

        {/* Multiplication */}
        {isMult && section.multiplication && (
          <div className="p-4 rounded-xl bg-emerald-50/20 border border-emerald-100 space-y-4">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Multiplication Rules</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldShell label="First Operand — Digit Type" editable={editable}>
                <Select
                  disabled={!editable}
                  value={section.multiplication.firstOperandDigits}
                  onValueChange={(val) => patchMult({ firstOperandDigits: val })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1 digit", "2 digit", "3 digit", "4 digit", "5 digit"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Second Operand — Digit Type" editable={editable}>
                <Select
                  disabled={!editable}
                  value={section.multiplication.secondOperandDigits}
                  onValueChange={(val) => patchMult({ secondOperandDigits: val })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1 digit", "2 digit", "3 digit", "4 digit"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldShell label="First Operand Min" editable={editable}>
                <Input disabled={!editable} value={section.multiplication.minFirstOperand} onChange={(e) => patchMult({ minFirstOperand: e.target.value })} className="h-8 text-xs font-mono" />
              </FieldShell>
              <FieldShell label="First Operand Max" editable={editable}>
                <Input disabled={!editable} value={section.multiplication.maxFirstOperand} onChange={(e) => patchMult({ maxFirstOperand: e.target.value })} className="h-8 text-xs font-mono" />
              </FieldShell>
              <FieldShell label="Second Operand Min" editable={editable}>
                <Input disabled={!editable} value={section.multiplication.minSecondOperand} onChange={(e) => patchMult({ minSecondOperand: e.target.value })} className="h-8 text-xs font-mono" />
              </FieldShell>
              <FieldShell label="Second Operand Max" editable={editable}>
                <Input disabled={!editable} value={section.multiplication.maxSecondOperand} onChange={(e) => patchMult({ maxSecondOperand: e.target.value })} className="h-8 text-xs font-mono" />
              </FieldShell>
            </div>
          </div>
        )}

        {/* Division */}
        {isDiv && section.division && (
          <div className="p-4 rounded-xl bg-purple-50/20 border border-purple-100 space-y-4">
            <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider">Division Rules</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FieldShell label="Dividend — Digit Type" editable={editable}>
                <Select disabled={!editable} value={section.division.dividendDigits} onValueChange={(val) => patchDiv({ dividendDigits: val })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1 digit", "2 digit", "3 digit", "4 digit", "5 digit", "6 digit"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Divisor — Digit Type" editable={editable}>
                <Select disabled={!editable} value={section.division.divisorDigits} onValueChange={(val) => patchDiv({ divisorDigits: val })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1 digit", "2 digit", "3 digit", "4 digit"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Remainder Rule" editable={editable}>
                <Select disabled={!editable} value={section.division.remainderRule} onValueChange={(val) => patchDiv({ remainderRule: val })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Exact division only">Exact Division Only</SelectItem>
                    <SelectItem value="Remainder allowed">Remainder Allowed</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldShell label="Dividend Min" editable={editable}>
                <Input disabled={!editable} value={section.division.minDividend} onChange={(e) => patchDiv({ minDividend: e.target.value })} className="h-8 text-xs font-mono" />
              </FieldShell>
              <FieldShell label="Dividend Max" editable={editable}>
                <Input disabled={!editable} value={section.division.maxDividend} onChange={(e) => patchDiv({ maxDividend: e.target.value })} className="h-8 text-xs font-mono" />
              </FieldShell>
              <FieldShell label="Divisor Min" editable={editable}>
                <Input disabled={!editable} value={section.division.minDivisor} onChange={(e) => patchDiv({ minDivisor: e.target.value })} className="h-8 text-xs font-mono" />
              </FieldShell>
              <FieldShell label="Divisor Max" editable={editable}>
                <Input disabled={!editable} value={section.division.maxDivisor} onChange={(e) => patchDiv({ maxDivisor: e.target.value })} className="h-8 text-xs font-mono" />
              </FieldShell>
            </div>
          </div>
        )}

        {/* Dynamic summary + validation */}
        <div className="rounded-xl border bg-slate-50/60 p-4 space-y-2 text-xs">
          <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Section Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 font-medium">
            <div><span className="text-muted-foreground">Section:</span> {section.name}</div>
            <div><span className="text-muted-foreground">Type:</span> {section.type}</div>
            <div><span className="text-muted-foreground">Questions:</span> {effectiveQuestions(section)}</div>
            <div><span className="text-muted-foreground">Rows:</span> {rows}</div>
            {!hideSectionTime && (
              <div><span className="text-muted-foreground">Time:</span> {effectiveTime(section)} min</div>
            )}
            {isMental && (
              <>
                <div><span className="text-muted-foreground">Digit Composition:</span> {formatCompositionSummary(section)}</div>
                {composition.mode === "model" && (
                  <div>
                    <span className="text-muted-foreground">Pattern Selection:</span>{" "}
                    {formatPatternSelectionLabel(composition.patternSelection)}
                  </div>
                )}
                <div><span className="text-muted-foreground">Operations:</span> {formatOperationsSummary(section.ops)}</div>
                <div><span className="text-muted-foreground">Digit Position:</span> {section.digitPositionPattern}</div>
              </>
            )}
          </div>
          {needsRepair && editable && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-2">
              <p className="text-[11px] text-amber-900 font-medium">
                Generation capacity: at most {capacity.maxUnique} unique questions ({capacity.explanation}) —
                configured {effectiveQuestions(section)} with duplicates disabled.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px] border-amber-300"
                onClick={() => commit(repairSectionForGeneration(section))}
              >
                {describeSectionRepairAction(section)}
              </Button>
            </div>
          )}
          <div className={`flex items-center gap-1.5 font-semibold ${validation.valid ? "text-emerald-600" : "text-rose-600"}`}>
            {validation.valid ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{validation.valid ? "Valid configuration" : validation.errors[0]}</span>
          </div>
          {!validation.valid && validation.errors.length > 1 && (
            <ul className="text-[10px] text-rose-600 list-disc pl-4 space-y-0.5">
              {validation.errors.slice(1).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
