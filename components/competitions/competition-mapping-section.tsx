"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Layers, FileText, Eye, AlertCircle, ArrowLeft, Sparkles, RefreshCw, Pencil, Plus, Trash2, MoreVertical, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, MoreHorizontal, Settings, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/axios";
import {
  buildQuestionPaperTree,
  createNextQuestionPaper,
  findQuestionPaperConfig,
  findSectionInQuestionPaper,
  expectedQuestionsForSection,
  expectedQuestionsForQuestionPaper,
  flattenQuestionPaperTree,
  formatPaperGenerationError,
  mergeQuestionPapersIntoRules,
  parseQuestionSetLabel,
  resolveQuestionPapersFromRules,
  sectionQuestionCount,
  sectionRowsPerQuestion,
  totalGeneratedInTree,
  type GeneratedQuestionLike,
  type QuestionPaperTree,
} from "@/lib/paper-section-utils";
import type { PaperSectionRules } from "@/lib/paper-section-rules.types";
import { formatOperationsSummary } from "@/lib/paper-section-rules.utils";
import {
  deriveGenerationStatus,
  QuestionGeneratorPapersTable,
  QuestionGeneratorSectionsTable,
  type QuestionPaperListRow,
  type SectionListRow,
} from "@/components/competitions/question-generator-list-tables";
import { QuestionGeneratorPapersSkeleton } from "@/components/shared/skeletons";
import {
  downloadAllQuestionPapersCsv,
  downloadQuestionPaperCsv,
  downloadQuestionSectionCsv,
  sanitizeDownloadFilename,
} from "@/lib/paper-question-export";
import {
  DataTable,
  TableMainCell,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  compareCompetitionStreams,
  parseMappingLevelOrder,
} from "@/lib/competition-mapping-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function buildPaginationPages(
  current: number,
  total: number
): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: (number | "ellipsis")[] = [];
  const push = (v: number | "ellipsis") => {
    if (out.length && out[out.length - 1] === v) return;
    out.push(v);
  };
  push(1);
  if (current > 3) push("ellipsis");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    push(p);
  }
  if (current < total - 2) push("ellipsis");
  if (total > 1) push(total);
  return out;
}

type PaperMappingRow = {
  id: number | string;
  stream: string;
  level: string;
  paper: string;
  program?: string;
  rules?: Record<string, unknown>;
  questions?: unknown[];
};

type MappingQuestionStatus = "pending" | "generated" | "empty";

function resolveMappingQuestionStatus(paper: PaperMappingRow): MappingQuestionStatus {
  const questionPaperCount = resolveQuestionPapersFromRules(paper?.rules).length;
  const questionCount = Array.isArray(paper.questions) ? paper.questions.length : 0;
  if (questionPaperCount === 0 && questionCount === 0) return "pending";
  if (questionCount > 0) return "generated";
  return "empty";
}

function parseLevelOrder(level: string): number {
  return parseMappingLevelOrder(level);
}

export function CompetitionMappingSection() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paperIdParam = searchParams.get("paperId");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [streamFilter, setStreamFilter] = useState("all");
  const [questionStatusFilter, setQuestionStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("catalog");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

  // Selected paper mapping to manage or generate questions
  const [activePaperForGenerator, setActivePaperForGenerator] = useState<any | null>(null);

  // Question paper navigation: null → question papers list; section null → sections list
  const [selectedQuestionPaper, setSelectedQuestionPaper] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [activeSet, setActiveSet] = useState("Question Paper 1 · Section A");

  const [questionPaperTree, setQuestionPaperTree] = useState<QuestionPaperTree>({});

  // Generator UI states
  const [questionsCount, setQuestionsCount] = useState(25);

  // Configure parameters dialog state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Edit question modal states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingRows, setEditingRows] = useState<string[]>([]);
  const [editingAnswer, setEditingAnswer] = useState<number>(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generateTargetPaper, setGenerateTargetPaper] = useState<any | null>(null);
  const [generateQuestionPaperName, setGenerateQuestionPaperName] = useState("");
  const [isPreparingQuestionPaper, setIsPreparingQuestionPaper] = useState(false);
  const [isGeneratingFromRules, setIsGeneratingFromRules] = useState(false);
  const [generatingQuestionPaperName, setGeneratingQuestionPaperName] = useState<string | null>(null);
  const [deletingQuestionPaperName, setDeletingQuestionPaperName] = useState<string | null>(null);
  const [isGeneratorLoading, setIsGeneratorLoading] = useState(false);

  const resetGenerateFlow = () => {
    setIsGeneratingFromRules(false);
    setGeneratingQuestionPaperName(null);
    toast.dismiss("generate-from-rules");
  };

  const selectedSectionConfig = useMemo(() => {
    if (!activePaperForGenerator || !selectedQuestionPaper || !selectedSection) return null;
    const paper = findQuestionPaperConfig(activePaperForGenerator.rules, selectedQuestionPaper);
    return findSectionInQuestionPaper(paper, selectedSection);
  }, [activePaperForGenerator, selectedQuestionPaper, selectedSection]);

  const unwrapMappingResponse = (data: any) => data?.result ?? data?.data ?? data;

  const reloadActivePaperMapping = async (mappingId: number | string) => {
    const res = await api.get(`/competitions/paper-mappings/${mappingId}`);
    const paper = unwrapMappingResponse(res.data);
    setActivePaperForGenerator(paper);
    setQuestionPaperTree(buildQuestionPaperTree(paper));
    return paper;
  };

  const openQuestionGenerator = (paper: any) => {
    setActivePaperForGenerator(paper);
    setQuestionPaperTree(buildQuestionPaperTree(paper));
    setSelectedQuestionPaper(null);
    setSelectedSection(null);
    setIsGeneratorLoading(true);
    void reloadActivePaperMapping(paper.id)
      .catch(() => {
        toast.error("Could not load question papers.");
        setActivePaperForGenerator(null);
      })
      .finally(() => setIsGeneratorLoading(false));
  };

  // Fetch all paper mappings (client-side filter + pagination)
  const { data: allPaperMappings = [], isLoading: isPaperLoading } = useQuery({
    queryKey: ["all-paper-mappings"],
    queryFn: async () => {
      try {
        const res = await api.get("/competitions/paper-mappings");
        const data = res.data?.result || res.data?.data || res.data;
        return (Array.isArray(data) ? data : data?.items || []) as PaperMappingRow[];
      } catch {
        return [] as PaperMappingRow[];
      }
    },
  });

  const streamFilterOptions = useMemo(() => {
    const streams = [...new Set(allPaperMappings.map((row) => row.stream).filter(Boolean))].sort(
      compareCompetitionStreams,
    );
    return [
      { value: "all", label: "All streams" },
      ...streams.map((stream) => ({ value: stream, label: stream })),
    ];
  }, [allPaperMappings]);

  const filteredPaperMappings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = allPaperMappings.filter((row) => {
      const status = resolveMappingQuestionStatus(row);
      const matchesSearch =
        !normalizedSearch ||
        row.stream.toLowerCase().includes(normalizedSearch) ||
        row.level.toLowerCase().includes(normalizedSearch) ||
        row.paper.toLowerCase().includes(normalizedSearch);
      const matchesStream = streamFilter === "all" || row.stream === streamFilter;
      const matchesStatus =
        questionStatusFilter === "all" || status === questionStatusFilter;
      return matchesSearch && matchesStream && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "stream":
          comparison =
            compareCompetitionStreams(a.stream, b.stream) ||
            parseLevelOrder(a.level) - parseLevelOrder(b.level);
          break;
        case "level":
          comparison =
            parseLevelOrder(a.level) - parseLevelOrder(b.level) ||
            compareCompetitionStreams(a.stream, b.stream);
          break;
        case "paper":
          comparison = a.paper.localeCompare(b.paper);
          break;
        case "status":
          comparison = resolveMappingQuestionStatus(a).localeCompare(resolveMappingQuestionStatus(b));
          break;
        case "catalog":
        default:
          comparison =
            compareCompetitionStreams(a.stream, b.stream) ||
            parseLevelOrder(a.level) - parseLevelOrder(b.level) ||
            a.paper.localeCompare(b.paper);
          break;
      }
      return sortOrder === "ASC" ? comparison : -comparison;
    });
  }, [allPaperMappings, questionStatusFilter, searchTerm, sortBy, sortOrder, streamFilter]);

  const total = filteredPaperMappings.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paperMappings = useMemo(() => {
    const offset = (page - 1) * limit;
    return filteredPaperMappings.slice(offset, offset + limit);
  }, [filteredPaperMappings, limit, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, streamFilter, questionStatusFilter, sortBy, sortOrder]);

  const persistQuestionTree = async (tree: QuestionPaperTree) => {
    if (!activePaperForGenerator) return;
    const questions = flattenQuestionPaperTree(tree);
    await api.post(`/competitions/paper-mappings/${activePaperForGenerator.id}/questions`, {
      questions,
    });
    setActivePaperForGenerator((prev: any) => (prev ? { ...prev, questions } : prev));
    queryClient.invalidateQueries({ queryKey: ["all-paper-mappings"] });
  };

  const generateFromRulesMutation = useMutation({
    mutationFn: async (payload: {
      paperId: number | string;
      questionPaperId: string;
      questionPaperName: string;
    }) => {
      const res = await api.post(`/competitions/paper-mappings/${payload.paperId}/generate-questions`, {
        questionPaperId: payload.questionPaperId,
        questionPaperName: payload.questionPaperName,
      });
      return res.data?.result ?? res.data?.data ?? res.data;
    },
    onSuccess: async (data: any) => {
      const mappingId = data.mappingId ?? activePaperForGenerator?.id;
      let paper = activePaperForGenerator;
      if (mappingId) {
        paper = await reloadActivePaperMapping(mappingId);
      } else {
        const tree = buildQuestionPaperTree({
          ...activePaperForGenerator,
          questions: data.questions,
        });
        setQuestionPaperTree(tree);
      }

      setSelectedQuestionPaper(data.questionPaperName ?? null);
      setSelectedSection(null);
      setIsGenerateDialogOpen(false);
      setGenerateTargetPaper(null);
      queryClient.invalidateQueries({ queryKey: ["all-paper-mappings"] });

      const generatedName = data.questionPaperName ?? "Question paper";
      const generatedCount = data.total ?? 0;
      const expected = expectedQuestionsForQuestionPaper(paper?.rules, generatedName);
      toast.dismiss("generate-from-rules");
      toast.success(
        expected
          ? `Generated ${generatedCount}/${expected} questions for ${generatedName}.`
          : `Generated ${generatedCount} questions for ${generatedName}.`,
      );
    },
    onError: (err: unknown) => {
      resetGenerateFlow();
      toast.error(formatPaperGenerationError(err));
    },
    onSettled: () => {
      resetGenerateFlow();
    },
  });

  const isGenerateFlowPending =
    isGeneratingFromRules || isPreparingQuestionPaper || generateFromRulesMutation.isPending;

  const applyRulesToPaperState = (paper: any, updatedRules: Record<string, unknown>) => {
    const updatedPaper = { ...paper, rules: updatedRules };
    setActivePaperForGenerator((prev: any) => (prev?.id === paper.id ? updatedPaper : prev));
    setGenerateTargetPaper((prev: any) => (prev?.id === paper.id ? updatedPaper : prev));
    setQuestionPaperTree(buildQuestionPaperTree(updatedPaper));
    return updatedPaper;
  };

  const openGenerateDialog = (paper: any) => {
    const configured = resolveQuestionPapersFromRules(paper?.rules);
    const fallbackSections = paper?.rules?.sections;
    if (configured.length === 0 && (!Array.isArray(fallbackSections) || fallbackSections.length === 0)) {
      toast.error("Save worksheet section rules before generating questions.");
      return;
    }
    setGenerateTargetPaper(paper);
    setGenerateQuestionPaperName(`Question Paper ${configured.length + 1}`);
    setIsGenerateDialogOpen(true);
  };

  const handleConfirmGenerateFromRules = async () => {
    if (!generateTargetPaper || isGenerateFlowPending) return;

    const name = generateQuestionPaperName.trim();
    if (!name) {
      toast.error("Enter a question paper name.");
      return;
    }

    setIsGeneratingFromRules(true);
    setGeneratingQuestionPaperName(name);
    setIsGenerateDialogOpen(false);
    setSelectedQuestionPaper(null);
    setSelectedSection(null);
    toast.loading(`Generating questions for "${name}"…`, { id: "generate-from-rules" });

    let paper = generateTargetPaper;
    try {
      paper = await reloadActivePaperMapping(generateTargetPaper.id);
      setGenerateTargetPaper(paper);
    } catch {
      resetGenerateFlow();
      toast.error("Could not load the latest saved rules. Try again.");
      return;
    }

    const configured = resolveQuestionPapersFromRules(paper.rules);
    const fallbackSections = paper.rules?.sections;
    if (configured.length === 0 && (!Array.isArray(fallbackSections) || fallbackSections.length === 0)) {
      resetGenerateFlow();
      toast.error("Save worksheet section rules before generating questions.");
      router.push(`/admin/competitions/rules/${paper.id}`);
      return;
    }

    let selected = configured.find((p) => p.name.trim() === name);

    if (selected) {
      const refreshedSelected = resolveQuestionPapersFromRules(paper.rules).find(
        (p) => p.name.trim() === name,
      );
      if (refreshedSelected) {
        selected = refreshedSelected;
      }
    }

    if (!selected) {
      setIsPreparingQuestionPaper(true);
      try {
        const sharedSections =
          paper.rules?.sections ??
          configured[0]?.sections ??
          fallbackSections ??
          [];
        const newPaper = createNextQuestionPaper(
          configured,
          fallbackSections,
          name,
          Boolean(paper?.rules?.allowDuplicates),
          sharedSections as PaperSectionRules[],
        );
        const updatedRules = mergeQuestionPapersIntoRules(
          paper.rules,
          [...configured, newPaper],
          sharedSections as PaperSectionRules[],
        );
        await api.put(`/competitions/paper-mappings/${paper.id}/rules`, updatedRules);
        paper = await reloadActivePaperMapping(paper.id);
        setGenerateTargetPaper(paper);
        const refreshed = resolveQuestionPapersFromRules(paper.rules);
        selected =
          refreshed.find((p) => p.name.trim() === name) ??
          refreshed.find((p) => p.id === newPaper.id) ??
          newPaper;
        queryClient.invalidateQueries({ queryKey: ["all-paper-mappings"] });
      } catch {
        resetGenerateFlow();
        toast.error("Failed to add question paper");
        return;
      } finally {
        setIsPreparingQuestionPaper(false);
      }
    }

    generateFromRulesMutation.mutate({
      paperId: paper.id,
      questionPaperId: selected.id,
      questionPaperName: selected.name,
    });
  };

  // Open generator when redirected from rules page
  useEffect(() => {
    if (!paperIdParam) return;

    const cached = allPaperMappings.find((p) => String(p.id) === paperIdParam);
    setActivePaperForGenerator(cached ?? { id: paperIdParam });
    setQuestionPaperTree(cached ? buildQuestionPaperTree(cached) : {});
    setSelectedQuestionPaper(null);
    setSelectedSection(null);
    setIsGeneratorLoading(true);

    void reloadActivePaperMapping(paperIdParam)
      .catch(() => {
        toast.error("Could not load generated paper mapping.");
        setActivePaperForGenerator(null);
      })
      .finally(() => setIsGeneratorLoading(false));
  }, [paperIdParam]);

  // Sync level and question paper tree when opening a mapping
  useEffect(() => {
    if (activePaperForGenerator) {
      setQuestionPaperTree(buildQuestionPaperTree(activePaperForGenerator));
      setSelectedQuestionPaper(null);
      setSelectedSection(null);

      const firstPaper = resolveQuestionPapersFromRules(activePaperForGenerator?.rules)[0];
      if (firstPaper) {
        const firstSection = firstPaper.sections[0];
        if (firstSection) {
          setActiveSet(`${firstPaper.name} · Section ${firstSection.name}`);
          setQuestionsCount(sectionQuestionCount(firstSection) || 1);
        }
      }
    }
  }, [activePaperForGenerator?.id]);

  useEffect(() => {
    if (!activePaperForGenerator || !activeSet) return;
    const parsed = parseQuestionSetLabel(activeSet);
    const fromRules = expectedQuestionsForSection(
      activePaperForGenerator?.rules,
      parsed.questionPaperName,
      parsed.sectionSetName,
    );
    if (fromRules > 0) {
      setQuestionsCount(fromRules);
    }
  }, [activeSet, activePaperForGenerator?.id]);

  const currentSectionQuestions: GeneratedQuestionLike[] =
    selectedQuestionPaper && selectedSection
      ? questionPaperTree[selectedQuestionPaper]?.[selectedSection] ?? []
      : [];

  const questionPaperNames = Object.keys(questionPaperTree);
  const questionPaperRows = useMemo<QuestionPaperListRow[]>(() => {
    if (!activePaperForGenerator) return [];
    const contextLabel = `Paper ${activePaperForGenerator.paper} · ${activePaperForGenerator.stream} · ${activePaperForGenerator.level}`;

    return questionPaperNames.map((paperName, index) => {
      const sections = questionPaperTree[paperName] ?? {};
      const questionCount = Object.values(sections).reduce((sum, qs) => sum + qs.length, 0);
      const expectedCount = expectedQuestionsForQuestionPaper(activePaperForGenerator.rules, paperName);
      const sectionCount = Object.keys(sections).length;

      return {
        id: `${paperName}-${index}`,
        name: paperName,
        questionCount,
        expectedCount,
        sectionCount,
        status: deriveGenerationStatus(questionCount, expectedCount),
        contextLabel,
      };
    });
  }, [activePaperForGenerator, questionPaperNames, questionPaperTree]);

  const sectionNamesForSelectedPaper = selectedQuestionPaper
    ? Object.keys(questionPaperTree[selectedQuestionPaper] ?? {})
    : [];

  const sectionRows = useMemo<SectionListRow[]>(() => {
    if (!activePaperForGenerator || !selectedQuestionPaper) return [];

    return sectionNamesForSelectedPaper.map((sectionName, index) => {
      const questionCount = questionPaperTree[selectedQuestionPaper]?.[sectionName]?.length || 0;
      const expectedCount = expectedQuestionsForSection(
        activePaperForGenerator.rules,
        selectedQuestionPaper,
        sectionName,
      );

      return {
        id: `${selectedQuestionPaper}-${sectionName}-${index}`,
        name: sectionName,
        questionCount,
        expectedCount,
        status: deriveGenerationStatus(questionCount, expectedCount),
      };
    });
  }, [activePaperForGenerator, questionPaperTree, sectionNamesForSelectedPaper, selectedQuestionPaper]);

  // Mutations
  const generateSectionFromRulesMutation = useMutation({
    mutationFn: async () => {
      if (!activePaperForGenerator || !selectedQuestionPaper || !selectedSection) {
        throw new Error("Select a question paper and section first.");
      }
      const paperConfig = findQuestionPaperConfig(activePaperForGenerator.rules, selectedQuestionPaper);
      const sectionName = selectedSection.replace(/^Section\s+/i, "");
      const res = await api.post(
        `/competitions/paper-mappings/${activePaperForGenerator.id}/generate-questions`,
        {
          questionPaperId: paperConfig?.id,
          questionPaperName: selectedQuestionPaper,
          sectionName,
        },
      );
      return res.data?.result ?? res.data?.data ?? res.data;
    },
    onSuccess: async (data: any) => {
      const mappingId = data.mappingId ?? activePaperForGenerator?.id;
      if (mappingId) {
        await reloadActivePaperMapping(mappingId);
      }
      setIsConfigModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["all-paper-mappings"] });

      const expected =
        activePaperForGenerator && selectedQuestionPaper && selectedSection
          ? expectedQuestionsForSection(
              activePaperForGenerator.rules,
              selectedQuestionPaper,
              selectedSection,
            )
          : 0;
      const generatedCount = data.total ?? 0;
      toast.success(
        expected
          ? `Generated ${generatedCount}/${expected} questions for ${selectedSection} from saved rules.`
          : `Generated ${generatedCount} questions for ${selectedSection} from saved rules.`,
      );
    },
    onError: (err: unknown) => {
      toast.error(formatPaperGenerationError(err));
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (rows: string[]) => {
      const res = await api.post("/competitions/questions/calculate", { rows });
      return res.data?.result || res.data?.data || res.data;
    },
    onSuccess: (data: any) => {
      setEditingAnswer(data?.answer ?? 0);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (questionsToSave: any[]) => {
      if (!activePaperForGenerator) return;
      const res = await api.post(`/competitions/paper-mappings/${activePaperForGenerator.id}/questions`, {
        questions: questionsToSave,
      });
      return res.data?.result || res.data?.data || res.data;
    },
    onSuccess: () => {
      toast.success("Questions successfully published to the practice paper!");
      queryClient.invalidateQueries({ queryKey: ["all-paper-mappings"] });
      setActivePaperForGenerator(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save questions");
    },
  });

  const handleRegenerateQuestion = async (idx: number) => {
    if (!activePaperForGenerator || !selectedQuestionPaper || !selectedSection) return;
    try {
      const paperConfig = findQuestionPaperConfig(activePaperForGenerator.rules, selectedQuestionPaper);
      const sectionName = selectedSection.replace(/^Section\s+/i, "");
      await api.post(`/competitions/paper-mappings/${activePaperForGenerator.id}/generate-questions`, {
        questionPaperId: paperConfig?.id,
        questionPaperName: selectedQuestionPaper,
        sectionName,
      });
      await reloadActivePaperMapping(activePaperForGenerator.id);
      queryClient.invalidateQueries({ queryKey: ["all-paper-mappings"] });
      toast.success(`Regenerated ${selectedSection} from saved rules (Question ${idx + 1} updated).`);
    } catch (err: unknown) {
      toast.error(formatPaperGenerationError(err));
    }
  };

  const handleOpenEdit = (idx: number) => {
    if (currentSectionQuestions.length === 0) return;
    const q = currentSectionQuestions[idx];
    setEditingIndex(idx);
    setEditingRows([...q.rows]);
    setEditingAnswer(q.answer);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !selectedQuestionPaper || !selectedSection) return;
    const parsed = parseQuestionSetLabel(activeSet);
    const updated = [...currentSectionQuestions];
    updated[editingIndex] = {
      qNo: editingIndex + 1,
      rows: editingRows,
      answer: editingAnswer,
      questionPaperName: parsed.questionPaperName,
      sectionName: parsed.sectionSetName.replace(/^Section\s+/i, ""),
      set: activeSet,
    };
    setQuestionPaperTree((prev) => ({
      ...prev,
      [selectedQuestionPaper]: {
        ...(prev[selectedQuestionPaper] ?? {}),
        [selectedSection]: updated,
      },
    }));
    setIsEditModalOpen(false);
    toast.success("Question updated successfully");
  };

  const handleRowChange = (rowIdx: number, value: string) => {
    const updated = [...editingRows];
    updated[rowIdx] = value;
    setEditingRows(updated);
    calculateMutation.mutate(updated);
  };

  const handleAddRow = () => {
    const updated = [...editingRows, "+0"];
    setEditingRows(updated);
    calculateMutation.mutate(updated);
  };

  const handleRemoveRow = (rowIdx: number) => {
    const updated = editingRows.filter((_, idx) => idx !== rowIdx);
    setEditingRows(updated);
    calculateMutation.mutate(updated);
  };

  const handlePublish = () => {
    publishMutation.mutate(flattenQuestionPaperTree(questionPaperTree));
  };

  const handleDeleteQuestionPaper = async (paperName: string) => {
    if (!activePaperForGenerator?.id || deletingQuestionPaperName) return;

    setDeletingQuestionPaperName(paperName);
    try {
      await api.delete(`/competitions/paper-mappings/${activePaperForGenerator.id}/question-papers`, {
        data: { questionPaperName: paperName },
      });

      await reloadActivePaperMapping(activePaperForGenerator.id);

      if (selectedQuestionPaper === paperName) {
        setSelectedQuestionPaper(null);
        setSelectedSection(null);
      }

      queryClient.invalidateQueries({ queryKey: ["all-paper-mappings"] });
      toast.success(`Deleted ${paperName} successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete question paper");
    } finally {
      setDeletingQuestionPaperName(null);
    }
  };

  const handleDeleteSection = async (sectionName: string) => {
    if (!selectedQuestionPaper) return;
    const nextTree: QuestionPaperTree = {
      ...questionPaperTree,
      [selectedQuestionPaper]: {
        ...(questionPaperTree[selectedQuestionPaper] ?? {}),
        [sectionName]: [],
      },
    };
    delete nextTree[selectedQuestionPaper][sectionName];
    if (Object.keys(nextTree[selectedQuestionPaper] ?? {}).length === 0) {
      delete nextTree[selectedQuestionPaper];
    }
    setQuestionPaperTree(nextTree);
    if (selectedSection === sectionName) {
      setSelectedSection(null);
    }
    try {
      await persistQuestionTree(nextTree);
      toast.success(`Deleted ${sectionName} successfully!`);
    } catch {
      toast.error("Failed to delete section");
      setQuestionPaperTree(questionPaperTree);
    }
  };

  const hasAnyQuestionsGenerated = totalGeneratedInTree(questionPaperTree) > 0;

  const buildDownloadPrefix = (...parts: string[]) =>
    sanitizeDownloadFilename(
      [
        activePaperForGenerator?.paper ? `Paper-${activePaperForGenerator.paper}` : "Paper",
        ...parts,
        activePaperForGenerator?.stream,
        activePaperForGenerator?.level,
      ]
        .filter(Boolean)
        .join("_"),
    );

  const handleDownloadAllQuestionPapers = () => {
    const count = downloadAllQuestionPapersCsv(
      questionPaperTree,
      buildDownloadPrefix("All-Question-Papers"),
    );
    if (count === 0) {
      toast.error("No questions available to download.");
      return;
    }
    toast.success(`Downloaded ${count} questions across all question papers.`);
  };

  const handleDownloadQuestionPaper = (paperName: string) => {
    const count = downloadQuestionPaperCsv(
      questionPaperTree,
      paperName,
      buildDownloadPrefix(paperName),
    );
    if (count === 0) {
      toast.error(`No questions to download for ${paperName}.`);
      return;
    }
    toast.success(`Downloaded ${count} questions from ${paperName}.`);
  };

  const handleDownloadSection = (paperName: string, sectionName: string) => {
    const count = downloadQuestionSectionCsv(
      questionPaperTree,
      paperName,
      sectionName,
      buildDownloadPrefix(`${paperName}_${sectionName}`),
    );
    if (count === 0) {
      toast.error(`No questions to download for ${sectionName}.`);
      return;
    }
    toast.success(`Downloaded ${count} questions from ${sectionName}.`);
  };

  const generateQuestionPaperDialog = (
    <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate from Rules</DialogTitle>
          <DialogDescription>
            Enter a name for the question paper to generate for Paper{" "}
            <span className="font-mono font-semibold">{generateTargetPaper?.paper ?? activePaperForGenerator?.paper}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid gap-2">
            <Label htmlFor="generateQuestionPaper">Question Paper Name</Label>
            <Input
              id="generateQuestionPaper"
              placeholder="E.g. Question Paper 2"
              value={generateQuestionPaperName}
              onChange={(e) => setGenerateQuestionPaperName(e.target.value)}
              disabled={isPreparingQuestionPaper || isGenerateFlowPending}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Type a name for this question paper. Each paper uses the same Paper {generateTargetPaper?.paper ?? "A"} section rules; only the generated questions differ.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsGenerateDialogOpen(false)}
            disabled={isGenerateFlowPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirmGenerateFromRules()}
            disabled={isGenerateFlowPending || !generateQuestionPaperName.trim()}
          >
            {isGenerateFlowPending ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const mappingListFilters: DataTableFilter[] = useMemo(
    () => [
      {
        key: "stream",
        label: "Stream",
        options: streamFilterOptions,
        defaultValue: "all",
      },
      {
        key: "questionStatus",
        label: "Question status",
        options: [
          { value: "all", label: "All statuses" },
          { value: "pending", label: "Pending" },
          { value: "generated", label: "Generated" },
          { value: "empty", label: "Empty" },
        ],
        defaultValue: "all",
      },
    ],
    [streamFilterOptions],
  );

  const mappingListSortOptions: DataTableSortOption[] = useMemo(
    () => [
      { value: "catalog", label: "Stream & level" },
      { value: "stream", label: "Stream" },
      { value: "level", label: "Level" },
      { value: "paper", label: "Paper code" },
      { value: "status", label: "Question status" },
    ],
    [],
  );

  const mappingListColumns: DataTableColumn<PaperMappingRow>[] = useMemo(
    () => [
      {
        key: "stream",
        header: "Stream",
        className: "w-[140px]",
      },
      {
        key: "level",
        header: "Level",
        className: "w-[120px]",
        render: (row) => <span className="text-sm font-semibold text-foreground">{row.level}</span>,
      },
      {
        key: "paper",
        header: "Paper code",
        className: "w-[120px]",
        render: (row) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.paper}
          </Badge>
        ),
      },
      {
        key: "questionStatus",
        header: "Question status",
        className: "w-[240px]",
        render: (row) => {
          const questionPaperCount = resolveQuestionPapersFromRules(row?.rules).length;
          const questionCount = Array.isArray(row.questions) ? row.questions.length : 0;
          const qpLabel = `${questionPaperCount} Question Paper${questionPaperCount === 1 ? "" : "s"}`;
          const status = resolveMappingQuestionStatus(row);

          if (status === "pending") {
            return (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-medium flex items-center gap-1 w-fit">
                <AlertCircle className="h-3 w-3 text-amber-600" />
                <span>0 Question Papers · Pending</span>
              </Badge>
            );
          }
          if (status === "generated") {
            return (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium flex items-center gap-1 w-fit">
                <Eye className="h-3 w-3 text-emerald-600" />
                <span>
                  {qpLabel} · {questionCount} Question{questionCount === 1 ? "" : "s"}
                </span>
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 font-medium flex items-center gap-1 w-fit">
              <FileText className="h-3 w-3 text-slate-500" />
              <span>{qpLabel} · Empty</span>
            </Badge>
          );
        },
      },
      {
        key: "actions",
        header: "",
        className: "w-[220px]",
        render: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5 flex items-center gap-1 border-border text-muted-foreground hover:bg-muted/50"
              onClick={(event) => {
                event.stopPropagation();
                router.push(`/admin/competitions/rules/${row.id}`);
              }}
            >
              <Settings className="h-3 w-3" />
              <span>Set Rules</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5 flex items-center gap-1 border-primary/40 hover:bg-primary/5 text-primary"
              onClick={(event) => {
                event.stopPropagation();
                openQuestionGenerator(row);
              }}
            >
              <Eye className="h-3 w-3" />
              <span>See Questions</span>
            </Button>
          </div>
        ),
      },
    ],
    [router],
  );

  if (activePaperForGenerator) {
    // RENDER THE QUESTION GENERATOR INSTEAD OF LIST
    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-200">
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsGeneratorLoading(false);
              setActivePaperForGenerator(null);
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground pl-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Mappings</span>
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-1.5 font-semibold"
              disabled={!hasAnyQuestionsGenerated || isGeneratorLoading}
              onClick={handleDownloadAllQuestionPapers}
            >
              <Download className="h-4 w-4" />
              <span>Download All</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/5"
              disabled={isGenerateFlowPending || isGeneratorLoading}
              onClick={() => openGenerateDialog(activePaperForGenerator)}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{isGenerateFlowPending ? "Generating..." : "Generate from Rules"}</span>
            </Button>
            <Button
              variant="outline"
              disabled={isGeneratorLoading}
              onClick={() => {
                setIsGeneratorLoading(false);
                setActivePaperForGenerator(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!hasAnyQuestionsGenerated || publishMutation.isPending || isGeneratorLoading}
              onClick={handlePublish}
            >
              {publishMutation.isPending ? "Publishing..." : "Publish Paper"}
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span>
              Question Generator:{" "}
              {activePaperForGenerator.stream && activePaperForGenerator.level
                ? `${activePaperForGenerator.stream} · ${activePaperForGenerator.level}`
                : "Loading…"}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Generate and manage math questions contextually assigned to Paper{" "}
            <span className="font-semibold text-foreground font-mono">
              {activePaperForGenerator.paper ?? "…"}
            </span>.
          </p>
        </div>

        {/* Dynamic Display Panel */}
        <div className="w-full space-y-6">
          {!selectedQuestionPaper ? (
            <div className="w-full animate-in fade-in duration-200">
              {isGeneratorLoading || isGeneratingFromRules ? (
                <div className="space-y-3">
                  {isGeneratingFromRules && generatingQuestionPaperName ? (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                      <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" />
                      <span>
                        Generating <span className="font-semibold">{generatingQuestionPaperName}</span>…
                      </span>
                    </div>
                  ) : null}
                  <QuestionGeneratorPapersSkeleton />
                </div>
              ) : (
                <QuestionGeneratorPapersTable
                  rows={questionPaperRows}
                  deletingName={deletingQuestionPaperName}
                  onOpen={setSelectedQuestionPaper}
                  onDownload={handleDownloadQuestionPaper}
                  onDelete={(paperName) => void handleDeleteQuestionPaper(paperName)}
                  toolbarActions={
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 gap-1.5 font-semibold"
                      disabled={isGenerateFlowPending}
                      onClick={() => openGenerateDialog(activePaperForGenerator)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate from Rules
                    </Button>
                  }
                  emptyAction={
                    <Button
                      type="button"
                      size="sm"
                      disabled={isGenerateFlowPending}
                      onClick={() => openGenerateDialog(activePaperForGenerator)}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate from Rules
                    </Button>
                  }
                />
              )}
            </div>
          ) : !selectedSection ? (
            <div className="space-y-6 w-full animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 border border-border/40 p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-lg font-semibold flex items-center gap-1.5"
                    onClick={() => setSelectedQuestionPaper(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Question Papers</span>
                  </Button>
                  <h4 className="font-bold text-base text-foreground">{selectedQuestionPaper}</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-lg font-semibold flex items-center gap-1.5 self-start sm:self-auto"
                  disabled={
                    Object.values(questionPaperTree[selectedQuestionPaper] ?? {}).reduce(
                      (sum, qs) => sum + qs.length,
                      0,
                    ) === 0
                  }
                  onClick={() => handleDownloadQuestionPaper(selectedQuestionPaper!)}
                >
                  <Download className="h-4 w-4" />
                  <span>Download {selectedQuestionPaper}</span>
                </Button>
              </div>

              <QuestionGeneratorSectionsTable
                rows={sectionRows}
                onOpen={(sectionName) => {
                  setSelectedSection(sectionName);
                  setActiveSet(`${selectedQuestionPaper} · ${sectionName}`);
                }}
                onDelete={(sectionName) => void handleDeleteSection(sectionName)}
              />
            </div>
          ) : (
            <div className="space-y-6 w-full animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 border border-border/40 p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-lg font-semibold flex items-center gap-1.5"
                    onClick={() => setSelectedSection(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Sections</span>
                  </Button>
                  <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                    <span>{selectedQuestionPaper}</span>
                    <span className="text-muted-foreground">/</span>
                    <span>{selectedSection}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {currentSectionQuestions.length}
                      {expectedQuestionsForSection(
                        activePaperForGenerator?.rules,
                        selectedQuestionPaper,
                        selectedSection,
                      ) > 0
                        ? ` / ${expectedQuestionsForSection(
                            activePaperForGenerator?.rules,
                            selectedQuestionPaper,
                            selectedSection,
                          )}`
                        : ""}{" "}
                      Qs
                    </Badge>
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs flex items-center gap-1.5"
                    disabled={currentSectionQuestions.length === 0}
                    onClick={() =>
                      handleDownloadSection(selectedQuestionPaper!, selectedSection!)
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Section</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs flex items-center gap-1.5"
                    onClick={() => setIsConfigModalOpen(true)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Configure & Generate {selectedSection}</span>
                  </Button>
                </div>
              </div>

              {currentSectionQuestions.length === 0 ? (
                <Card className="border-dashed border-2 flex flex-col items-center justify-center p-12 text-center h-[300px] bg-muted/5 w-full">
                  <FileText className="h-10 w-10 text-muted-foreground/60 mb-3 stroke-1 animate-pulse" />
                  <h4 className="font-bold text-muted-foreground text-sm">No Questions in {selectedSection}</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                    Generate questions for {selectedQuestionPaper} → {selectedSection} from saved rules.
                  </p>
                  <Button size="sm" className="flex items-center gap-2 font-bold px-4" onClick={() => setIsConfigModalOpen(true)}>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate {selectedSection}</span>
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {currentSectionQuestions.map((q, idx) => (
                    <Card key={idx} className="border border-border/60 shadow-xs rounded-2xl overflow-hidden hover:border-primary/40 transition-colors flex flex-col justify-between">
                      <CardHeader className="py-2.5 px-4 border-b border-border/40 flex flex-row items-center justify-between bg-white dark:bg-card">
                        <span className="font-bold text-sm text-foreground">Q. {q.qNo}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(idx)} className="flex items-center gap-2 cursor-pointer">
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit Question</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRegenerateQuestion(idx)} className="flex items-center gap-2 cursor-pointer text-muted-foreground">
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Regenerate Question</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>

                      <CardContent className="py-6 px-6 flex flex-col items-center justify-center font-semibold text-base leading-relaxed">
                        <div className="w-[85px] mx-auto text-base tracking-wide">
                          {q.rows.map((row, rIdx) => {
                            const isAdd = row.startsWith("+");
                            const isSub = row.startsWith("-");

                            if (isAdd) {
                              return (
                                <div key={rIdx} className="text-emerald-600 flex justify-between font-bold">
                                  <span>+</span>
                                  <span>{row.substring(1)}</span>
                                </div>
                              );
                            } else if (isSub) {
                              return (
                                <div key={rIdx} className="text-rose-600 flex justify-between font-bold">
                                  <span>-</span>
                                  <span>{row.substring(1)}</span>
                                </div>
                              );
                            } else {
                              return (
                                <div key={rIdx} className="text-foreground flex justify-between font-bold">
                                  <span>&nbsp;</span>
                                  <span>{row}</span>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </CardContent>

                      <CardFooter className="py-3 px-4 border-t border-border/40 flex justify-between items-center bg-slate-50/50 dark:bg-muted/10">
                        <span className="text-sm font-semibold text-muted-foreground">Answer</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{q.answer}</span>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configure Parameters Modal */}
        <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate {selectedSection ?? "Section"} from Saved Rules</DialogTitle>
              <DialogDescription>
                Uses the section rules saved for Paper {activePaperForGenerator.paper}. Edit rules on the Rules page, save, then regenerate here.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm space-y-2">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Question paper</span>
                  <span className="font-semibold text-right">{selectedQuestionPaper ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Section</span>
                  <span className="font-semibold text-right">{selectedSection ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Questions</span>
                  <span className="font-semibold text-right">{questionsCount}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Rows per question</span>
                  <span className="font-semibold text-right">
                    {selectedSectionConfig ? sectionRowsPerQuestion(selectedSectionConfig) : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Operations</span>
                  <span className="font-semibold text-right">
                    {"ops" in (selectedSectionConfig ?? {}) &&
                    Array.isArray((selectedSectionConfig as PaperSectionRules)?.ops)
                      ? formatOperationsSummary((selectedSectionConfig as PaperSectionRules).ops)
                      : "—"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This replaces all questions in {selectedSection} for {selectedQuestionPaper}. Other sections stay unchanged.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => generateSectionFromRulesMutation.mutate()}
                disabled={generateSectionFromRulesMutation.isPending || !selectedSectionConfig}
              >
                {generateSectionFromRulesMutation.isPending
                  ? "Generating..."
                  : `Generate ${selectedSection ?? "Section"}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Edit Question Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Question Manually ({activeSet})</DialogTitle>
              <DialogDescription>
                Modify values or add rows. The answer will be dynamically recalculated by the backend.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 py-2">
              {editingRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-xs w-6 text-muted-foreground">#{idx + 1}</span>
                  <Input
                    className="font-mono"
                    value={row}
                    onChange={(e) => handleRowChange(idx, e.target.value)}
                    placeholder="E.g. +123 or -45"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleRemoveRow(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-2"
              onClick={handleAddRow}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>

            <div className="flex justify-between items-center bg-muted/40 rounded-lg p-3 border mt-4">
              <span className="text-sm font-semibold text-muted-foreground">Calculated Answer:</span>
              <Badge className="text-sm font-bold bg-primary text-primary-foreground px-3 py-1">
                {calculateMutation.isPending ? "Calculating..." : editingAnswer}
              </Badge>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={calculateMutation.isPending}>
                Save Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {generateQuestionPaperDialog}
      </div>
    );
  }

  // STANDARD LIST VIEW
  return (
    <div className="flex flex-col gap-4 space-y-2">
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Competition Stream & Level Mapping
        </h3>
        <p className="text-xs text-muted-foreground">
          Map competition events to student academic streams and levels for franchise opt-in.
        </p>
      </div>

      <DataTable
        data={paperMappings}
        loading={isPaperLoading}
        columns={mappingListColumns}
        getRowId={(row) => String(row.id)}
        renderMainCell={(row) => <TableMainCell title={row.stream} />}
        searchPlaceholder="Search by stream, level, or paper code..."
        onSearchChange={setSearchTerm}
        filters={mappingListFilters}
        onFilterChange={(key, value) => {
          if (key === "stream") {
            setStreamFilter(String(value));
          }
          if (key === "questionStatus") {
            setQuestionStatusFilter(String(value));
          }
        }}
        sortOptions={mappingListSortOptions}
        defaultSortBy="catalog"
        defaultSortOrder="ASC"
        onSortChange={(nextSortBy, nextSortOrder) => {
          setSortBy(nextSortBy);
          setSortOrder(nextSortOrder);
        }}
        pagination={{ total, totalPages }}
        currentPage={page}
        onPageChange={setPage}
        itemsPerPage={limit}
        emptyState={{
          title: allPaperMappings.length === 0 ? "No stream & level mappings configured" : "No mappings match your filters",
          hint:
            allPaperMappings.length === 0
              ? "Go to Practice paper to assign stream and level mappings."
              : "Try adjusting your search or filters.",
          action:
            allPaperMappings.length === 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/competitions/practice-paper")}
              >
                Open Practice paper
              </Button>
            ) : undefined,
        }}
        resultsText={(count, filteredTotal) =>
          `Showing ${count} of ${filteredTotal} mapping${filteredTotal === 1 ? "" : "s"}`
        }
        tableClassName="table-fixed"
        columnGroupWidths={["140px", "120px", "120px", "240px", "220px"]}
      />
      {generateQuestionPaperDialog}
    </div>
  );
}
