"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Trophy, Layers, FileText, Users, Calendar,
  ClipboardList, ShieldCheck, BookOpen,
  LayoutDashboard, ShoppingCart, Globe, Upload, 
  Plus, Trash2, Edit2, Play, Save, Eye, AlertTriangle, 
  CheckCircle, RefreshCw, X, ChevronRight, HelpCircle, Check, Undo2, Sliders, PlayCircle, Lock
} from "lucide-react";
import { api } from "@/lib/axios";
import { createNextQuestionPaper, formatPaperGenerationError, totalQuestionsFromRules } from "@/lib/paper-section-utils";
import type { PaperSectionRules, QuestionPaperRulesConfig } from "@/lib/paper-section-rules.types";
import {
  createDefaultSection,
  effectiveRows,
  normalizeSectionRules,
  repairAllSectionsForGeneration,
  resolveSharedSectionsFromRules,
  switchRuleSource,
  syncLegacyFields,
  syncModelSnapshot,
  syncQuestionPapersWithSharedSections,
  validateSectionRules,
} from "@/lib/paper-section-rules.utils";
import { SectionRuleBuilder } from "@/components/competitions/section-rule-builder";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GLOBAL_DEFAULT_RULE_KEYS = [
  "globalOps",
  "globalNumType",
  "minVal",
  "maxVal",
  "answerRule",
  "minAnswer",
  "maxAnswer",
  "repeatedNumbers",
  "sequenceRule",
  "carryBorrow",
  "firstOperandDigits",
  "secondOperandDigits",
  "dividendDigits",
  "divisorDigits",
  "remainderRule",
] as const;

function pickPreservedGlobalDefaults(rules: Record<string, unknown> | null | undefined) {
  if (!rules) return {};
  return Object.fromEntries(
    GLOBAL_DEFAULT_RULE_KEYS.filter((key) => rules[key] !== undefined).map((key) => [key, rules[key]]),
  );
}

export default function EditLevelRulesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mappingId = params.id;

  // Tabs navigation state
  const [activeTab, setActiveTab] = useState<"general" | "sections" | "validation">("general");

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const { data: mappingData, isLoading, refetch } = useQuery({
    queryKey: ["paper-mapping-detail", mappingId],
    queryFn: async () => {
      const res = await api.get(`/competitions/paper-mappings/${mappingId}`);
      return res.data?.result ?? res.data?.data ?? res.data;
    },
  });

  // -------------------------------------------------------------
  // Form State
  // -------------------------------------------------------------
  const [stream, setStream] = useState("Regular");
  const [level, setLevel] = useState("Level 1");
  const [paperCode, setPaperCode] = useState("A");
  const [paperName, setPaperName] = useState("A / K - ZHUSUAN");
  const [paperType, setPaperType] = useState("Zhusuan");
  const [status, setStatus] = useState("Active");
  const [description, setDescription] = useState("Mental calculation paper based on the approved model paper.");

  // Paper Settings
  const [paperTime, setPaperTime] = useState(5);
  const [sameTime, setSameTime] = useState(true);
  const [negativeAllowed, setNegativeAllowed] = useState("Not Allowed");
  const [zeroAllowed, setZeroAllowed] = useState("Not Allowed");
  const [startingNumber, setStartingNumber] = useState("Positive");
  const [calculationType, setCalculationType] = useState("Mental");
  const [numberSystem, setNumberSystem] = useState("Base 10 (Decimal)");
  const [answerType, setAnswerType] = useState("Exact Answer");

  const [showAnswerColumn, setShowAnswerColumn] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleRows, setShuffleRows] = useState(false);
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  const [questionPapers, setQuestionPapers] = useState<QuestionPaperRulesConfig[]>([]);

  // Dynamic sections for the active question paper — populated from saved rules JSON only
  const [sections, setSections] = useState<PaperSectionRules[]>([]);

  const rulesHydratedRef = useRef(false);

  const normalizeSectionOnLoad = (section: PaperSectionRules): PaperSectionRules =>
    syncModelSnapshot(syncLegacyFields(normalizeSectionRules(section)));

  const handleUpdateSection = (id: string, fields: Partial<PaperSectionRules>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? syncLegacyFields({ ...s, ...fields }) : s)),
    );
  };

  const handleSectionChange = (updated: PaperSectionRules) => {
    setSections((prev) =>
      prev.map((s) => (s.id === updated.id ? syncLegacyFields(updated) : s)),
    );
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setSections((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Sync state from fetched mapping rules (once per mapping — avoid wiping edits on refetch)
  useEffect(() => {
    rulesHydratedRef.current = false;
  }, [mappingId]);

  useEffect(() => {
    if (!mappingData || rulesHydratedRef.current) return;
    rulesHydratedRef.current = true;
      setStream(mappingData.stream || "Regular");
      setLevel(mappingData.level || "Level 1");
      setPaperCode(mappingData.paper || "A");

      const r = mappingData.rules;
      const fallbackPaperName = mappingData.paper
        ? `${mappingData.paper} - ZHUSUAN`
        : "A - ZHUSUAN";
      setPaperName(r?.paperName || mappingData.paperName || fallbackPaperName);

      if (r) {
        if (r.paperType) setPaperType(r.paperType);
        if (r.status) setStatus(r.status);
        if (r.description) setDescription(r.description);
        if (r.paperTime !== undefined) setPaperTime(r.paperTime);
        if (r.sameTime !== undefined) setSameTime(r.sameTime);
        if (r.negativeAllowed) setNegativeAllowed(r.negativeAllowed);
        if (r.zeroAllowed) setZeroAllowed(r.zeroAllowed);
        if (r.startingNumber) setStartingNumber(r.startingNumber);
        if (r.calculationType) setCalculationType(r.calculationType);
        if (r.numberSystem) setNumberSystem(r.numberSystem);
        if (r.answerType) setAnswerType(r.answerType);
        if (r.showAnswerColumn !== undefined) setShowAnswerColumn(r.showAnswerColumn);
        if (r.shuffleQuestions !== undefined) setShuffleQuestions(r.shuffleQuestions);
        if (r.shuffleRows !== undefined) setShuffleRows(r.shuffleRows);
        if (r.allowDuplicates !== undefined) setAllowDuplicates(r.allowDuplicates);

        if (Array.isArray(r.questionPapers) && r.questionPapers.length > 0) {
          const allowDup = r.allowDuplicates ?? false;
          const normalizedShared = repairAllSectionsForGeneration(
            resolveSharedSectionsFromRules(r).map((section: PaperSectionRules) => normalizeSectionOnLoad(section)),
            allowDup,
          );
          const loadedPapers = syncQuestionPapersWithSharedSections(r.questionPapers, normalizedShared);
          const repaired = normalizedShared.some((section, index) => {
            const source = resolveSharedSectionsFromRules(r).map((item: PaperSectionRules) =>
              normalizeSectionOnLoad(item),
            );
            return effectiveRows(section) !== effectiveRows(source[index] ?? section);
          });
          if (repaired) {
            toast.info("Section rules were adjusted for generation capacity. Save rules to persist.");
          }
          setQuestionPapers(loadedPapers);
          setSections(normalizedShared);
        } else if (r.sections) {
          const allowDup = r.allowDuplicates ?? false;
          const normalized = r.sections.map((section: PaperSectionRules) => normalizeSectionOnLoad(section));
          const loadedSections = repairAllSectionsForGeneration(normalized, allowDup);
          if (loadedSections.some((section, index) => effectiveRows(section) !== effectiveRows(normalized[index]))) {
            toast.info("Section rules were adjusted for generation capacity. Save rules to persist.");
          }
          const defaultPaper = {
            id: "1",
            name: "Question Paper 1",
            sections: loadedSections,
          };
          setQuestionPapers([defaultPaper]);
          setSections(loadedSections);
        }
      }
  }, [mappingData]);

  // Derived Values
  const totalQuestions = totalQuestionsFromRules(sections);
  const totalTime = sameTime ? paperTime : sections.reduce((acc, curr) => acc + (parseFloat(curr.time) || 0), 0);

  // -------------------------------------------------------------
  // UI Dialog Controls
  // -------------------------------------------------------------
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewRulesOpen, setIsPreviewRulesOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [genStep, setGenStep] = useState(0); // 0: loading, 1: results
  const [generatedPaperData, setGeneratedPaperData] = useState<any[]>([]);
  const [generatedQuestionCount, setGeneratedQuestionCount] = useState(0);
  const [isGeneratePickerOpen, setIsGeneratePickerOpen] = useState(false);
  const [generatePickerQuestionPaperName, setGeneratePickerQuestionPaperName] = useState("");

  // -------------------------------------------------------------
  // Operations & Section handlers
  // -------------------------------------------------------------
  const handleAddSection = () => {
    const nextChar = String.fromCharCode(65 + sections.length);
    const newSec = syncLegacyFields(
      switchRuleSource(createDefaultSection(nextChar, sections.length), "override"),
    );
    setSections((prev) => [...prev, newSec]);
    toast.success(`Section ${nextChar} added!`);
  };

  const handleDeleteSection = (id: string, name: string) => {
    setSections(sections.filter((s) => s.id !== id));
    toast.success(`Section ${name} deleted!`);
  };

  const validateAllSections = (): boolean => {
    if (sameTime) {
      if (!paperTime || paperTime <= 0) {
        toast.error("Total paper time must be greater than 0.");
        return false;
      }
    } else {
      for (const section of sections) {
        const time = Number.parseFloat(String(section.time || section.modelTime || ""));
        if (!Number.isFinite(time) || time <= 0) {
          toast.error(`Section ${section.name}: Time must be greater than 0.`);
          return false;
        }
      }
    }

    for (const section of sections) {
      const result = validateSectionRules(section, { allowDuplicates, skipTimeValidation: sameTime });
      if (!result.valid) {
        toast.error(`Section ${section.name}: ${result.errors[0]}`);
        return false;
      }
    }
    return true;
  };

  const toggleSectionOp = (sectionId: string, op: string) => {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return;
    const ops = sec.ops.includes(op)
      ? sec.ops.filter(o => o !== op)
      : [...sec.ops, op];
    handleUpdateSection(sectionId, { ops });
  };

  const runRulesBasedGeneration = async (questionPaperId: string, questionPaperName: string) => {
    setIsGeneratorOpen(true);
    setGenStep(0);
    try {
      const res = await api.post(`/competitions/paper-mappings/${mappingId}/generate-questions`, {
        questionPaperId,
        questionPaperName,
      });
      const data = res.data?.result ?? res.data?.data ?? res.data;
      const paperSections = data?.questionPapers?.[questionPaperName]?.sections ?? {};
      const sectionCards = Object.entries(paperSections).map(([sectionName, questions]) => ({
        name: sectionName.replace(/^Section\s+/i, ""),
        questions: questions as any[],
        set: `${questionPaperName} · ${sectionName}`,
      }));
      setGeneratedPaperData(sectionCards);
      setGeneratedQuestionCount(data?.total ?? sectionCards.reduce((n, s) => n + s.questions.length, 0));
      setGenStep(1);
    } catch (err) {
      setIsGeneratorOpen(false);
      toast.error(formatPaperGenerationError(err, "Failed to generate questions from saved rules."));
    }
  };

  const openGeneratePicker = () => {
    if (!questionPapers.length) {
      toast.error("Add at least one question paper from the Question Generator before generating.");
      return;
    }
    setGeneratePickerQuestionPaperName(questionPapers[0]?.name ?? "Question Paper 1");
    setIsGeneratePickerOpen(true);
  };

  const handleConfirmRunGenerator = async () => {
    const name = generatePickerQuestionPaperName.trim();
    if (!name) {
      toast.error("Enter a question paper name.");
      return;
    }

    let selected = questionPapers.find((paper) => paper.name === name);
    let papersToSave = questionPapers;

    if (!selected) {
      const newPaper = createNextQuestionPaper(
        questionPapers,
        sections,
        name,
        allowDuplicates,
        sections,
      ) as QuestionPaperRulesConfig;
      papersToSave = [...questionPapers, newPaper];
      selected = newPaper;
      setQuestionPapers(papersToSave);
    }

    setIsGeneratePickerOpen(false);
    try {
      await saveMutation.mutateAsync({ generateNow: false, questionPapersOverride: papersToSave });
      await runRulesBasedGeneration(selected.id, selected.name);
      refetch();
    } catch {
      toast.error("Failed to save rules and generate questions.");
    }
  };

  // -------------------------------------------------------------
  // Mutations & Actions
  // -------------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: async ({
      generateNow,
      questionPaperId,
      questionPaperName,
      questionPapersOverride,
    }: {
      generateNow: boolean;
      questionPaperId?: string;
      questionPaperName?: string;
      questionPapersOverride?: QuestionPaperRulesConfig[];
    }) => {
      if (!mappingData) {
        throw new Error("Mapping not loaded");
      }

      for (const section of sections) {
        const result = validateSectionRules(normalizeSectionOnLoad(section), { allowDuplicates });
        if (!result.valid) {
          throw new Error(`Section ${section.name}: ${result.errors[0]}`);
        }
      }

      const sharedSections = repairAllSectionsForGeneration(
        sections.map((section) => normalizeSectionOnLoad(section)),
        allowDuplicates,
      );
      const papersForSave = syncQuestionPapersWithSharedSections(
        questionPapersOverride ?? questionPapers,
        sharedSections,
      );

      const rulesPayload = {
          ...pickPreservedGlobalDefaults(mappingData.rules as Record<string, unknown> | undefined),
          paperName,
          paperType,
          status,
          description,
          paperTime: sameTime ? paperTime : totalTime,
          sameTime,
          negativeAllowed,
          zeroAllowed,
          startingNumber,
          calculationType,
          numberSystem,
          answerType,
          showAnswerColumn,
          shuffleQuestions,
          shuffleRows,
          allowDuplicates,
          questionPapers: papersForSave,
          sections: sharedSections,
        };

      await api.put(`/competitions/paper-mappings/${mappingId}/rules`, rulesPayload);

      if (generateNow && questionPaperId && questionPaperName) {
        await runRulesBasedGeneration(questionPaperId, questionPaperName);
      }
    },
    onSuccess: (_, variables) => {
      if (variables.generateNow) {
        toast.success("Rules saved and questions generated!");
      } else {
        toast.success("Rules saved successfully!");
      }
      queryClient.invalidateQueries({ queryKey: ["all-paper-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["paper-mapping-detail", mappingId] });
      refetch();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save level rules.");
    }
  });

  // Mock Generated Worksheet Preview Data
  const generateMockWorksheet = () => {
    const result: any[] = [];
    sections.forEach((sec) => {
      const qs: any[] = [];
      const isMult = sec.type === "Multiplication";
      const isDiv = sec.type === "Division";

      for (let i = 1; i <= 5; i++) { // show 5 sample questions per section
        const rows: string[] = [];
        let total = 0;
        
        if (isMult) {
          const first = Math.floor(Math.random() * 90) + 10;
          const second = Math.floor(Math.random() * 8) + 2;
          rows.push(`${first} × ${second}`);
          total = first * second;
        } else if (isDiv) {
          const second = Math.floor(Math.random() * 8) + 2;
          const first = (Math.floor(Math.random() * 30) + 5) * second;
          rows.push(`${first} ÷ ${second}`);
          total = first / second;
        } else {
          const rowsLimit = sec.ruleSource === "override" ? sec.rows : sec.modelRows;
          for (let r = 0; r < rowsLimit; r++) {
            const isSub = r > 0 && sec.ops.includes("-") && Math.random() > 0.5;
            const minR = sec.minRange ?? 1;
            const maxR = sec.maxRange ?? 9;
            const digit = Math.floor(Math.random() * (maxR - minR + 1)) + minR;
            if (isSub) {
              rows.push(`-${digit}`);
              total -= digit;
            } else {
              rows.push(r > 0 ? `+${digit}` : `${digit}`);
              total += digit;
            }
          }
        }
        qs.push({ qNo: i, rows, answer: total });
      }
      result.push({ name: sec.name, questions: qs, ops: sec.ops, type: sec.type });
    });
    setGeneratedPaperData(result);
  };

  useEffect(() => {
    generateMockWorksheet();
  }, [sections]);

  // Mock saving generated questions (already persisted by generate-questions API)
  const publishGeneratedQuestions = async () => {
    try {
      toast.success("Questions published to the question generator!");
      setIsGeneratorOpen(false);
      router.push(`/admin/competitions/mapping?paperId=${mappingId}`);
    } catch {
      toast.error("Failed to open question generator.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Loading rule configuration dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <span>HQ Dashboard</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span>Practice Paper Mappings</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="text-blue-400">Rules Engine</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-full hover:bg-slate-800 text-slate-300"
              onClick={() => router.push("/admin/competitions/mapping")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Edit Level Rules:</span>
              <span className="text-blue-400 font-mono font-black">{paperCode}</span>
              <span className="text-slate-400 text-sm font-normal">{stream} · {level}</span>
            </h2>
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
              Active
            </Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Configure question-generation rules, time parameters, and arithmetic section layouts based on the approved model paper template.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="h-9 px-4 text-xs font-bold text-slate-300 border-slate-700 bg-transparent hover:bg-slate-800"
            onClick={() => router.push("/admin/competitions/mapping")}
          >
            Cancel
          </Button>
          <Button 
            variant="outline" 
            className="h-9 px-4 text-xs font-bold text-slate-300 border-slate-700 bg-transparent hover:bg-slate-800 flex items-center gap-1.5"
            onClick={() => setIsPreviewRulesOpen(true)}
          >
            <Sliders className="h-4 w-4" />
            <span>Preview Rules</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-9 px-4 text-xs font-bold text-blue-400 border-blue-900/50 bg-blue-950/10 hover:bg-blue-950/30 flex items-center gap-1.5"
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
            <span>Preview Paper</span>
          </Button>
          <Button 
            className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 flex items-center gap-1.5"
            onClick={() => saveMutation.mutate({ generateNow: false })}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saveMutation.isPending ? "Saving..." : "Save Rules"}</span>
          </Button>
        </div>
      </header>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-1 shrink-0 sticky top-0 z-10 shadow-xs">
        {[
          { id: "general", label: "General Settings", icon: Sliders },
          { id: "sections", label: "Section Configurations", icon: Layers },
          { id: "validation", label: "Validation & Generation", icon: ShieldCheck },
        ].map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative py-4 px-5 text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 ${
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <Badge variant="outline" className={`text-[10px] py-0.5 px-2 rounded-full font-bold ${isActive ? "border-blue-500 text-blue-600 bg-blue-50/50" : "border-slate-300 text-slate-500"}`}>
                {index + 1}
              </Badge>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-in fade-in zoom-in-50 duration-200" />
              )}
            </button>
          );
        })}
      </div>

      {/* WORKSPACE CONTENT */}
      <div className="p-8 flex-1 flex flex-col overflow-y-auto">
        
        {/* LEFT FORM AREA */}
        <div className="w-full space-y-8 pb-16">
          
          {/* TAB 1 — GENERAL SETTINGS */}
          {activeTab === "general" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
              
              {/* CARD 1 — BASIC INFORMATION */}
              <Card className="border border-slate-200/80 shadow-xs dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-850 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-black">1</span>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Basic Information</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">Configure the naming, academic stream, and metadata for this paper.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20 px-4 py-3 text-[11px] text-blue-800 dark:text-blue-300">
                    Stream, level, and paper code come from the assigned mapping row and cannot be changed here.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="streamSelect" className="text-xs font-bold text-slate-700 dark:text-slate-300">Stream</Label>
                      <Input
                        id="streamSelect"
                        readOnly
                        value={stream}
                        className="h-9 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="levelSelect" className="text-xs font-bold text-slate-700 dark:text-slate-300">Level</Label>
                      <Input
                        id="levelSelect"
                        readOnly
                        value={level}
                        className="h-9 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="paperCode" className="text-xs font-bold text-slate-700 dark:text-slate-300">Paper Code</Label>
                      <Input
                        id="paperCode"
                        readOnly
                        value={paperCode}
                        className="h-9 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="paperName" className="text-xs font-bold text-slate-700 dark:text-slate-300">Paper Name</Label>
                      <Input id="paperName" value={paperName} onChange={(e) => setPaperName(e.target.value)} className="h-9 text-xs rounded-lg" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="paperType" className="text-xs font-bold text-slate-700 dark:text-slate-300">Paper Type</Label>
                      <Select value={paperType} onValueChange={setPaperType}>
                        <SelectTrigger id="paperType" className="h-9 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Zhusuan">Zhusuan</SelectItem>
                          <SelectItem value="Mental">Mental</SelectItem>
                          <SelectItem value="Multiplication">Multiplication</SelectItem>
                          <SelectItem value="Division">Division</SelectItem>
                          <SelectItem value="Mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="statusSelect" className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger id="statusSelect" className="h-9 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="desc" className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</Label>
                    <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-xs rounded-lg" />
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2 — DYNAMIC PAPER SETTINGS */}
              <Card className="border border-slate-200/80 shadow-xs dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-850 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-black">2</span>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Dynamic Paper Settings</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">Adjust layout constraints, calculators, and global validation parameters.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Negative Numbers</Label>
                      <Select value={negativeAllowed} onValueChange={setNegativeAllowed}>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Not Allowed">Not Allowed</SelectItem>
                          <SelectItem value="Allowed">Allowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Zero Allowed</Label>
                      <Select value={zeroAllowed} onValueChange={setZeroAllowed}>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Not Allowed">Not Allowed</SelectItem>
                          <SelectItem value="Allowed">Allowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Starting Number Sign</Label>
                      <Select value={startingNumber} onValueChange={setStartingNumber}>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Positive">Positive</SelectItem>
                          <SelectItem value="Negative">Negative</SelectItem>
                          <SelectItem value="Positive / Negative">Positive / Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Calculation Type</Label>
                      <Select value={calculationType} onValueChange={setCalculationType}>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mental">Mental</SelectItem>
                          <SelectItem value="Written">Written</SelectItem>
                          <SelectItem value="Mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Number System</Label>
                      <Select value={numberSystem} onValueChange={setNumberSystem}>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Base 10 (Decimal)">Base 10 (Decimal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Answer Type</Label>
                      <Select value={answerType} onValueChange={setAnswerType}>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Exact Answer">Exact Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Label className="flex items-center gap-3 font-normal cursor-pointer select-none">
                      <Checkbox checked={showAnswerColumn} onCheckedChange={(val: any) => setShowAnswerColumn(val)} className="h-4 w-4 rounded" />
                      <div>
                        <span className="text-xs font-bold block">Show Answer Column</span>
                        <span className="text-[10px] text-muted-foreground">Expose calculated keys in worksheet mock previews.</span>
                      </div>
                    </Label>
                    <Label className="flex items-center gap-3 font-normal cursor-pointer select-none">
                      <Checkbox checked={shuffleQuestions} onCheckedChange={(val: any) => setShuffleQuestions(val)} className="h-4 w-4 rounded" />
                      <div>
                        <span className="text-xs font-bold block">Shuffle Questions</span>
                        <span className="text-[10px] text-muted-foreground">Randomize generated questions order per sheet.</span>
                      </div>
                    </Label>
                    <Label className="flex items-center gap-3 font-normal cursor-pointer select-none">
                      <Checkbox checked={shuffleRows} onCheckedChange={(val: any) => setShuffleRows(val)} className="h-4 w-4 rounded" />
                      <div>
                        <span className="text-xs font-bold block">Shuffle Rows</span>
                        <span className="text-[10px] text-muted-foreground">Shuffle equation rows within single questions.</span>
                      </div>
                    </Label>
                    <Label className="flex items-center gap-3 font-normal cursor-pointer select-none">
                      <Checkbox checked={allowDuplicates} onCheckedChange={(val: any) => setAllowDuplicates(val)} className="h-4 w-4 rounded" />
                      <div>
                        <span className="text-xs font-bold block">Allow Duplicate Numbers</span>
                        <span className="text-[10px] text-muted-foreground">Let identical digits repeat in back-to-back steps.</span>
                      </div>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 3 — TIME SETTINGS */}
              <Card className="border border-slate-200/80 shadow-xs dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-850 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-black">3</span>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Time & Duration</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">
                        {sameTime
                          ? "Set one total duration for the whole paper."
                          : "Set a duration for each section individually."}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Time Allocation Mode</Label>
                    <div className="flex flex-col sm:flex-row gap-6">
                      <Label className="flex items-center gap-2 font-normal cursor-pointer select-none">
                        <input 
                          type="radio" 
                          name="timeMode" 
                          checked={sameTime} 
                          onChange={() => setSameTime(true)}
                          className="h-4 w-4 text-blue-600 border-slate-350 focus:ring-blue-500" 
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Uniform: Total paper time only</span>
                      </Label>
                      <Label className="flex items-center gap-2 font-normal cursor-pointer select-none">
                        <input 
                          type="radio" 
                          name="timeMode" 
                          checked={!sameTime} 
                          onChange={() => setSameTime(false)}
                          className="h-4 w-4 text-blue-600 border-slate-350 focus:ring-blue-500" 
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom: Individual time per section</span>
                      </Label>
                    </div>
                  </div>

                  {sameTime ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Total Paper Time (Minutes)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={paperTime}
                          onChange={(e) => setPaperTime(Number(e.target.value))}
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Time Unit</Label>
                        <Input readOnly value="Minutes" className="h-9 text-xs bg-slate-50 dark:bg-slate-950 rounded-lg text-slate-400 cursor-not-allowed" />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border dark:bg-slate-950 dark:border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Section Durations (Minutes)</h5>
                        <span className="text-[10px] font-bold text-slate-500">Total: {totalTime} min</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sections.map((sec) => (
                          <div key={sec.id} className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-lg">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">Sec {sec.name}</span>
                            <Input 
                              type="number"
                              min={0.1}
                              step={0.25}
                              value={sec.time} 
                              onChange={(e) => handleUpdateSection(sec.id, { time: e.target.value })} 
                              className="h-8 w-24 text-xs font-semibold rounded-md"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Label className="flex items-center gap-3 font-normal cursor-pointer select-none">
                      <Checkbox checked={true} className="h-4 w-4 rounded" />
                      <div>
                        <span className="text-xs font-bold block">Show Countdown Timer</span>
                        <span className="text-[10px] text-muted-foreground">Displays ticking timer warning students during online exams.</span>
                      </div>
                    </Label>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

          {/* TAB 2 — SECTION CONFIGURATIONS */}
          {activeTab === "sections" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
              
              <Card className="border border-slate-200/80 shadow-xs dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-850 py-4 px-6 flex flex-row justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-black">4</span>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Paper {paperCode} · Sections ({sections.length})
                      </CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground font-medium">
                        One rule set for Paper {paperCode}. All question papers share these section rules; add question papers from the Question Generator.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                      type="button" 
                      size="sm" 
                      className="bg-blue-600 text-white hover:bg-blue-700 h-8 flex items-center gap-1 text-xs font-bold shadow-md rounded-lg"
                      onClick={handleAddSection}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Section</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {questionPapers.length > 0 && (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 dark:bg-slate-950/40 px-4 py-3 text-[11px] text-muted-foreground space-y-1">
                      <p>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {questionPapers.length} question paper{questionPapers.length === 1 ? "" : "s"}
                        </span>{" "}
                        use these rules: {questionPapers.map((paper) => paper.name).join(", ")}.
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        Any new question paper added from the Question Generator will automatically use the same section rules.
                      </p>
                    </div>
                  )}
                  {sections.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-xl bg-slate-50/40 text-muted-foreground text-xs font-medium">
                      No sections added yet. Click &quot;Add Section&quot; to configure paper worksheets.
                    </div>
                  ) : (
                    sections.map((sec, index) => (
                      <SectionRuleBuilder
                        key={sec.id}
                        section={sec}
                        alwaysEditable
                        allowDuplicates={allowDuplicates}
                        hideSectionTime={sameTime}
                        onChange={handleSectionChange}
                        onDelete={() => handleDeleteSection(sec.id, sec.name)}
                        onMoveUp={() => moveSection(index, -1)}
                        onMoveDown={() => moveSection(index, 1)}
                        canMoveUp={index > 0}
                        canMoveDown={index < sections.length - 1}
                      />
                    ))
                  )}

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-10 text-xs flex items-center justify-center gap-1.5 border-dashed border-2 hover:bg-slate-50/50 dark:hover:bg-slate-900 rounded-xl font-bold"
                    onClick={handleAddSection}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Section</span>
                  </Button>
                </CardContent>
              </Card>

            </div>
          )}

          {/* TAB 3 — VALIDATION & PIPELINE */}
          {activeTab === "validation" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
              
              {/* CARD 5 — PIPELINE SETTINGS */}
              <Card className="border border-slate-200/80 shadow-xs dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-850 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-black">5</span>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Validation Pipeline</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground font-medium">Verify generated questions conform strictly to active rules.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-4">
                    {[
                      { title: "Answer Validation", desc: "Verifies every generated total/result matches the target range and rules (e.g. non-negative)." },
                      { title: "Rule Constraint Matching", desc: "Checks every operand digit size and arithmetic step to ensure it remains strictly within section parameters." },
                      { title: "Duplicate Question Detection", desc: "Scans generated question blocks to prevent identical digit series from appearing twice in the paper." },
                      { title: "Model Pattern Validation", desc: "Matches generated question layouts against the approved model paper structures." },
                      { title: "Auto Regeneration Pipeline", desc: "Automatically discards and regenerates any single question that fails any of the validation checks above." }
                    ].map((pipeline, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-4 p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl">
                        <Checkbox checked={true} className="mt-1 h-4 w-4 rounded" />
                        <div>
                          <Label className="text-xs font-bold block">{pipeline.title}</Label>
                          <span className="text-[10px] text-muted-foreground block mt-0.5 leading-normal">{pipeline.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CARD 9 — EXECUTION CONSOLE */}
              <Card className="border-blue-100 bg-blue-50/10 dark:border-blue-900/30 dark:bg-blue-950/5 shadow-xs rounded-2xl overflow-hidden p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/10">
                    <PlayCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-855 dark:text-blue-300 uppercase tracking-wider">Active Execution Console</h4>
                    <p className="text-[11px] text-slate-400 font-medium">Trigger paper generation using current parameters.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    type="button"
                    onClick={openGeneratePicker}
                    disabled={saveMutation.isPending}
                    className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-blue-500/10"
                  >
                    <Play className="h-4 w-4" />
                    <span>Run AI Question Generator</span>
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsPreviewRulesOpen(true)}
                    className="h-11 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl"
                  >
                    <Sliders className="h-4 w-4" />
                    <span>Preview Rules</span>
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsPreviewOpen(true)}
                    className="h-11 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview Printable Paper</span>
                  </Button>
                </div>
              </Card>

            </div>
          )}

        </div>

      </div>

      {/* -------------------------------------------------------------
          DIALOG — WORKSHEET SAMPLE PREVIEW (Printed Exam Sheet Theme)
          ------------------------------------------------------------- */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap w-full">
              <DialogTitle className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-500" />
                <span>Printed Exam Worksheet Preview</span>
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-2 bg-slate-50 border-slate-200 font-mono">
                Level {level} · Code {paperCode}
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Review how the generated questions layout will render on student question sheets.
            </DialogDescription>
          </DialogHeader>

          {/* PRINT SHEET CONTAINER */}
          <div className="py-6 space-y-8 bg-slate-50/50 dark:bg-slate-950/20 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 font-mono">
            
            {/* Header info */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-double border-slate-300 dark:border-slate-800">
              <h3 className="text-base font-extrabold tracking-widest text-slate-900 dark:text-white">INTERNATIONAL ABACUS ASSOCIATION</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">ANNUAL COMPETITION PRACTICE SHEET</p>
              <div className="flex justify-center gap-6 text-[10px] text-slate-500 font-bold pt-1">
                <span>STREAM: {stream.toUpperCase()}</span>
                <span>LEVEL: {level.toUpperCase()}</span>
                <span>PAPER CODE: {paperCode}</span>
                <span>TIME: {totalTime} MINUTES</span>
              </div>
            </div>

            {generatedPaperData.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Section {sec.name} · {sec.type}
                  </h4>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 py-0.5 px-2 rounded-md">
                    Questions: 1 - {sec.questions.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  {sec.questions.map((q: any) => (
                    <div key={q.qNo} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden flex flex-col justify-between shadow-xs">
                      <div className="bg-slate-50 dark:bg-slate-850 py-1 px-3 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 flex justify-between">
                        <span>No. {q.qNo}</span>
                        {showAnswerColumn && <span className="text-blue-500 font-bold">A: {q.answer}</span>}
                      </div>
                      
                      {/* Math rows */}
                      <div className="p-4 flex flex-col items-end justify-center font-bold text-xs font-mono min-h-[110px] leading-relaxed border-b border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900">
                        {q.rows.map((row: string, rIdx: number) => {
                          const isAdd = row.startsWith("+");
                          const isSub = row.startsWith("-");
                          if (isAdd) {
                            return <div key={rIdx} className="text-slate-800 dark:text-slate-200 flex justify-between w-full"><span>+</span><span>{row.substring(1)}</span></div>;
                          } else if (isSub) {
                            return <div key={rIdx} className="text-rose-600 flex justify-between w-full"><span>-</span><span>{row.substring(1)}</span></div>;
                          } else {
                            return <div key={rIdx} className="text-slate-800 dark:text-slate-200 flex justify-between w-full"><span>&nbsp;</span><span>{row}</span></div>;
                          }
                        })}
                      </div>

                      {/* Student answer field placeholder */}
                      <div className="h-6 bg-slate-50/50 dark:bg-slate-900/50 text-[9px] text-slate-300 font-bold flex items-center justify-center border-t border-slate-100 dark:border-slate-850 select-none">
                        [ Answer Box ]
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>

          <DialogFooter className="border-t border-slate-200 dark:border-slate-855 pt-4 gap-2 flex-wrap">
            <Button variant="outline" className="text-xs font-bold rounded-lg" onClick={() => setIsPreviewOpen(false)}>Close Preview</Button>
            <Button 
              className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-lg" 
              onClick={() => {
                setIsPreviewOpen(false);
                openGeneratePicker();
              }}
            >
              Generate Active Paper
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------
          DIALOG — GENERATING QUESTIONS NOW (AI Pipeline Progress)
          ------------------------------------------------------------- */}
      <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span>AI Question Generation Pipeline</span>
            </DialogTitle>
          </DialogHeader>

          {genStep === 0 ? (
            <div className="py-8 space-y-6 text-center font-sans">
              <div className="flex justify-center">
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-16 w-16 animate-ping rounded-full bg-blue-100 dark:bg-blue-950/50" />
                  <RefreshCw className="relative h-10 w-10 animate-spin text-blue-600" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Generating {totalQuestions} questions based on rules...</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Running automated validators to ensure zero duplicates, proper carry/borrow limits, and rule compliance.
                </p>
              </div>

              {/* Mock pipeline steps */}
              <div className="text-left max-w-xs mx-auto space-y-2 text-[10px] border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle className="h-4 w-4" />
                  <span>Loading level parameters</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle className="h-4 w-4" />
                  <span>Extracting target range limits</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>AI generation (evaluating combinations)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-bold">
                  <div className="h-4 w-4 rounded-full border border-slate-300" />
                  <span>Taint check and duplicate verification</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-6">
              <div className="flex flex-col items-center gap-3 text-center border-b pb-6">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Questions Generated Successfully!</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1">Generated {generatedQuestionCount || totalQuestions} questions. Auto-validation check completed.</p>
                </div>
              </div>

              <div className="space-y-3 font-sans">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Pipeline Logs</h5>
                <div className="rounded-xl p-4 bg-slate-950 text-slate-300 font-mono text-[10px] space-y-1.5 max-h-[160px] overflow-y-auto leading-relaxed shadow-inner">
                  <p className="text-emerald-400 font-bold">[INFO] Initialized question pool creation</p>
                  {generatedPaperData.map((sec) => (
                    <p key={sec.name}>[INFO] {sec.set || `Section ${sec.name}`}: generated {sec.questions?.length ?? 0} questions</p>
                  ))}
                  <p className="text-emerald-400 font-bold">[INFO] Validator: {generatedQuestionCount || totalQuestions}/{generatedQuestionCount || totalQuestions} questions verified</p>
                  <p className="text-emerald-400 font-bold">[SUCCESS] Paper mapping {paperCode} populated!</p>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t gap-2 flex-wrap">
                <Button variant="outline" className="text-xs font-bold rounded-lg" onClick={() => setIsGeneratorOpen(false)}>Discard</Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                  onClick={publishGeneratedQuestions}
                >
                  Publish & Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------
          DIALOG — PREVIEW RULES
          ------------------------------------------------------------- */}
      <Dialog open={isPreviewRulesOpen} onOpenChange={setIsPreviewRulesOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap w-full">
              <DialogTitle className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="h-6 w-6 text-blue-500" />
                <span>Active Rules Config Preview</span>
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-2 bg-slate-50 border-slate-200 font-mono">
                Level {level} Rules JSON Schema
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Check the structural rules parameters before applying the changes to the generator model.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            
            {/* General parameters */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Global Configurations</h4>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/20 text-xs space-y-2 font-mono">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="text-slate-400">Stream / Level:</span> <span className="font-bold">{stream} / {level}</span></div>
                  <div><span className="text-slate-400">Paper Type:</span> <span className="font-bold">{paperType}</span></div>
                  <div><span className="text-slate-400">Zero / Negatives:</span> <span className="font-bold">{zeroAllowed} / {negativeAllowed}</span></div>
                  <div><span className="text-slate-400">Answer constraint:</span> <span className="font-bold">{answerType}</span></div>
                  <div><span className="text-slate-400">Total Duration:</span> <span className="font-bold">{totalTime} Minutes</span></div>
                  <div><span className="text-slate-400">Calculation Type:</span> <span className="font-bold">{calculationType}</span></div>
                </div>
              </div>
            </div>

            {/* Sections override parameters */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Worksheet Sections Rules</h4>
              <div className="space-y-3 font-mono">
                {sections.map((sec) => (
                  <div key={sec.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">
                    <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold">
                      <span className="font-mono text-blue-600 dark:text-blue-400">Section {sec.name} ({sec.type})</span>
                      <Badge className="text-[9px] border-0 bg-slate-200 text-slate-850 dark:bg-slate-800 dark:text-slate-300">
                        {sec.ruleSource === "model" ? "Default Model Paper Rule" : "Custom Admin Override"}
                      </Badge>
                    </div>
                    <div className="p-4 text-xs grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                      <div><span className="text-slate-400">Questions:</span> <span className="font-bold">{sec.ruleSource === "override" ? sec.questions : sec.modelQuestions}</span></div>
                      <div><span className="text-slate-400">Rows Count:</span> <span className="font-bold">{effectiveRows(sec)}</span></div>
                      <div><span className="text-slate-400">Duration:</span> <span className="font-bold">{sec.ruleSource === "override" ? sec.time : sec.modelTime}m</span></div>
                      
                      {sec.type === "Mental/Zhusuan" && (
                        <>
                          <div><span className="text-slate-400">Operations:</span> <span className="font-bold">{sec.ops.join(", ")}</span></div>
                          <div><span className="text-slate-400">Digit Position:</span> <span className="font-bold">{sec.digitPositionPattern === "random" ? "Random" : sec.digitPositionPattern === "model" ? "Model Paper Pattern" : sec.digitPositionPattern === "fixed" ? "Fixed" : sec.digitPositionPattern === "custom" ? "Custom" : sec.digitPositionPattern}</span></div>
                          <div><span className="text-slate-400">Operation Pattern:</span> <span className="font-bold">{sec.operationPattern === "random" ? "Random Sequence" : sec.operationPattern === "model" ? "Model Paper Pattern" : sec.operationPattern === "custom" ? "Custom Sequence" : sec.opPattern}</span></div>
                          <div><span className="text-slate-400">Numbers Range:</span> <span className="font-bold font-mono">{sec.minRange} - {sec.maxRange}</span></div>
                          <div><span className="text-slate-400">Signs (1st / Follow):</span> <span className="font-bold">{sec.firstNumberSign} / {sec.followingNumbersSign}</span></div>
                        </>
                      )}

                      {sec.type === "Multiplication" && (
                        <>
                          <div><span className="text-slate-400">Operand Digits:</span> <span className="font-bold">{sec.firstOperandDigits} × {sec.secondOperandDigits}</span></div>
                          <div><span className="text-slate-400">Operand 1 Range:</span> <span className="font-bold font-mono">{sec.minFirstOperand || "10"} - {sec.maxFirstOperand || "99"}</span></div>
                          <div><span className="text-slate-400">Operand 2 Range:</span> <span className="font-bold font-mono">{sec.minSecondOperand || "2"} - {sec.maxSecondOperand || "9"}</span></div>
                        </>
                      )}

                      {sec.type === "Division" && (
                        <>
                          <div><span className="text-slate-400">Dividend / Divisor:</span> <span className="font-bold">{sec.dividendDigits} ÷ {sec.divisorDigits}</span></div>
                          <div><span className="text-slate-400">Remainder rule:</span> <span className="font-bold">{sec.remainderRule}</span></div>
                          <div><span className="text-slate-400">Dividend Range:</span> <span className="font-bold font-mono">{sec.minDividend || "100"} - {sec.maxDividend || "999"}</span></div>
                          <div><span className="text-slate-400">Divisor Range:</span> <span className="font-bold font-mono">{sec.minDivisor || "2"} - {sec.maxDivisor || "9"}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Schema printout */}
            <div className="space-y-3 font-sans">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration Payload Export</h4>
              <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[10px] leading-relaxed max-h-[180px] overflow-y-auto border shadow-inner">
                {JSON.stringify({
                  paper: paperCode,
                  stream,
                  level,
                  sections: sections.map(s => ({
                    name: s.name,
                    type: s.type,
                    questions: s.ruleSource === "override" ? s.questions : s.modelQuestions,
                    rows: effectiveRows(s),
                    time: s.ruleSource === "override" ? s.time : s.modelTime,
                    ops: s.ops,
                    digitPositionPattern: s.digitPositionPattern,
                    operationPattern: s.operationPattern,
                    customOperationPattern: s.customOperationPattern,
                    opPattern: s.opPattern,
                    customPattern: s.customPattern,
                    firstNumberSign: s.firstNumberSign,
                    followingNumbersSign: s.followingNumbersSign,
                    ranges: s.type === "Multiplication" 
                      ? { mult1: [s.minFirstOperand, s.maxFirstOperand], mult2: [s.minSecondOperand, s.maxSecondOperand] }
                      : s.type === "Division"
                        ? { dividend: [s.minDividend, s.maxDividend], divisor: [s.minDivisor, s.maxDivisor], remainder: s.remainderRule }
                        : [s.minRange, s.maxRange]
                  }))
                }, null, 2)}
              </pre>
            </div>

          </div>

          <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-4 font-sans">
            <Button variant="outline" className="text-xs font-bold rounded-lg" onClick={() => setIsPreviewRulesOpen(false)}>Close Preview</Button>
            <Button 
              className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-lg flex items-center gap-1.5" 
              disabled={saveMutation.isPending}
              onClick={() => {
                setIsPreviewRulesOpen(false);
                saveMutation.mutate({ generateNow: false });
              }}
            >
              {saveMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              {saveMutation.isPending ? "Saving..." : "Save These Rules"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGeneratePickerOpen} onOpenChange={setIsGeneratePickerOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Generate from Rules</DialogTitle>
            <DialogDescription>
              Enter a name for the question paper to generate from the saved rules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="rulesGenerateQuestionPaper">Question Paper Name</Label>
            <Input
              id="rulesGenerateQuestionPaper"
              placeholder="E.g. Question Paper 2"
              value={generatePickerQuestionPaperName}
              onChange={(e) => setGeneratePickerQuestionPaperName(e.target.value)}
              disabled={saveMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Type a name for this question paper. New names are created using the same sections as your last paper.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneratePickerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRunGenerator} disabled={saveMutation.isPending || !generatePickerQuestionPaperName.trim()}>
              {saveMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
