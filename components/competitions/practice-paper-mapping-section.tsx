"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, FileText, Trash2, ArrowRight, ChevronRight, ChevronDown, Pencil, ChevronLeft, ChevronFirst, ChevronLast, MoreHorizontal, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { getAllStreams, getAllLevelsByProgram, type Stream, type LevelItem } from "@/services/stream.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleField } from "@/components/shared/toggle-field";
import { toast } from "sonner";

export type LevelMatchMode = "at_level" | "completed_level";

export interface SubMappingItem {
  name: string;
  minAge?: number | string | null;
  maxAge?: number | string | null;
}

export interface PaperMapping {
  id: number | string;
  paper: string;
  program: string;
  stream: string;
  level: string;
  month?: number | null;
  levelMatchMode?: LevelMatchMode;
  ageGroup?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  subMappings?: SubMappingItem[];
}

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

export function PracticePaperMappingSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PaperMapping | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string | number, boolean>>({});

  // Form State for Assign / Edit Paper
  const [paperCode, setPaperCode] = useState("");
  const [program] = useState("Abacus");
  const [stream, setStream] = useState("Regular");
  const [level, setLevel] = useState("Level 1");
  const [levelMatchMode, setLevelMatchMode] = useState<LevelMatchMode>("completed_level");
  const [month, setMonth] = useState<number | null>(null);
  const [subMappingsList, setSubMappingsList] = useState<SubMappingItem[]>([]);

  const toggleExpand = (id: string | number) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenCreate = () => {
    setEditingMapping(null);
    setPaperCode("");
    setStream("Regular");
    setLevel("Level 1");
    setLevelMatchMode("completed_level");
    setMonth(null);
    setSubMappingsList([]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: PaperMapping) => {
    setEditingMapping(item);
    setPaperCode(item.paper || "");
    setStream(item.stream || "Regular");
    setLevel(item.level || "Level 1");
    setLevelMatchMode(item.levelMatchMode === "at_level" ? "at_level" : "completed_level");
    setMonth(item.month ?? null);

    if (Array.isArray(item.subMappings) && item.subMappings.length > 0) {
      setSubMappingsList(
        item.subMappings.map((s) => ({
          name: s.name || "",
          minAge: s.minAge != null ? String(s.minAge) : "",
          maxAge: s.maxAge != null ? String(s.maxAge) : "",
        }))
      );
    } else if (item.ageGroup || item.minAge != null || item.maxAge != null) {
      setSubMappingsList([
        {
          name: item.ageGroup || "",
          minAge: item.minAge != null ? String(item.minAge) : "",
          maxAge: item.maxAge != null ? String(item.maxAge) : "",
        },
      ]);
    } else {
      setSubMappingsList([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMapping(null);
    setPaperCode("");
    setLevelMatchMode("completed_level");
    setMonth(null);
    setSubMappingsList([]);
  };

  const handleAddSubMapping = () => {
    setSubMappingsList((prev) => [...prev, { name: "", minAge: "", maxAge: "" }]);
  };

  const handleRemoveSubMapping = (index: number) => {
    setSubMappingsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSubMapping = (index: number, field: keyof SubMappingItem, value: string) => {
    setSubMappingsList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Fetch Streams from Academic Catalog (Level Ladder)
  const { data: streamsData } = useQuery({
    queryKey: ["all-streams"],
    queryFn: getAllStreams,
  });

  // Fetch Levels from Academic Catalog (Level Ladder)
  const { data: levelsData } = useQuery({
    queryKey: ["all-levels-program-1"],
    queryFn: () => getAllLevelsByProgram(1),
  });

  const streamsList = React.useMemo(() => {
    return (streamsData || []).filter(
      (s) => s.name && !s.name.toUpperCase().startsWith("LEVEL")
    );
  }, [streamsData]);

  const levelsList = levelsData || [];

  // Filter levels by selected stream if available
  const availableLevels = React.useMemo(() => {
    const activeStream = streamsList.find((s) => s.name.toLowerCase() === stream.toLowerCase());
    if (activeStream && levelsList.length > 0) {
      const filtered = levelsList.filter((l) => l.streamId === activeStream.id);
      if (filtered.length > 0) return filtered;
    }
    return levelsList;
  }, [streamsList, levelsList, stream]);

  // The selected LevelItem object (to read durationInMonths)
  const selectedLevelItem = React.useMemo(() => {
    return availableLevels.find((l) => l.name.toLowerCase() === level.toLowerCase()) ?? null;
  }, [availableLevels, level]);

  // Month options: 1 … durationInMonths (default 3 if not set)
  const monthOptions = React.useMemo(() => {
    const count = selectedLevelItem?.durationInMonths ?? 3;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedLevelItem]);

  // Fetch mappings from backend API
  const { data: mappingsResponse, isLoading } = useQuery({
    queryKey: ["practice-paper-mappings", page, limit],
    queryFn: async () => {
      try {
        const res = await api.get(`/competitions/paper-mappings?page=${page}&limit=${limit}`);
        const data = res.data?.result || res.data?.data || res.data;
        return data;
      } catch {
        return { items: [], total: 0, page: 1, totalPages: 0 };
      }
    },
  });

  const mappings: PaperMapping[] = mappingsResponse?.items || [];
  const total = mappingsResponse?.total || 0;
  const totalPages = mappingsResponse?.totalPages || 0;

  // Create Mapping Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: {
      paper: string;
      program: string;
      stream: string;
      level: string;
      month?: number | null;
      levelMatchMode?: LevelMatchMode;
      ageGroup?: string;
      minAge?: number;
      maxAge?: number;
      subMappings?: SubMappingItem[];
    }) => {
      return api.post("/competitions/paper-mappings", payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["practice-paper-mappings"] });
      toast.success("Practice Paper Mapping saved successfully!", {
        description: `Mapped ${variables.paper} → ${variables.stream} → ${variables.level}`,
      });
      handleCloseDialog();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save paper mapping");
    },
  });

  // Update Mapping Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number | string; payload: any }) => {
      return api.put(`/competitions/paper-mappings/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-paper-mappings"] });
      toast.success("Practice Paper Mapping updated successfully!");
      handleCloseDialog();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update paper mapping");
    },
  });

  // Delete Mapping Mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: number | string; paperName: string }) => {
      return api.delete(`/competitions/paper-mappings/${id}`);
    },
    onMutate: async (variables) => {
      queryClient.setQueryData(
        ["practice-paper-mappings", page, limit],
        (old: { items: PaperMapping[]; total: number; page: number; totalPages: number } | undefined) => {
          if (!old) return undefined;
          const items = old.items.filter((m) => String(m.id) !== String(variables.id));
          return {
            ...old,
            items,
            total: Math.max(0, old.total - 1),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["practice-paper-mappings"] });
      toast.success(`Removed mapping for paper ${variables.paperName}`);
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ["practice-paper-mappings"] });
      toast.error(err.response?.data?.message || "Failed to delete paper mapping");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!paperCode.trim()) {
      toast.error("Please enter or select a Practice Paper code");
      return;
    }

    if (levelMatchMode === "at_level" && (month === null || month === undefined)) {
      toast.error("Please select a month for At level mappings");
      return;
    }

    const formattedSubMappings = subMappingsList
      .filter((s) => (s.name && s.name.trim()) || s.minAge || s.maxAge)
      .map((s) => ({
        name: (s.name || "").trim(),
        minAge: s.minAge ? parseInt(String(s.minAge), 10) : null,
        maxAge: s.maxAge ? parseInt(String(s.maxAge), 10) : null,
      }));

    const firstSub = formattedSubMappings[0];

    const payload = {
      paper: paperCode.trim().toUpperCase(),
      program,
      stream,
      level,
      month: levelMatchMode === "at_level" ? month ?? undefined : null,
      levelMatchMode,
      ageGroup: firstSub ? firstSub.name : undefined,
      minAge: firstSub && firstSub.minAge != null ? firstSub.minAge : undefined,
      maxAge: firstSub && firstSub.maxAge != null ? firstSub.maxAge : undefined,
      subMappings: formattedSubMappings,
    };

    if (editingMapping) {
      updateMutation.mutate({ id: editingMapping.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getSubMappingsListForItem = (item: PaperMapping): SubMappingItem[] => {
    if (Array.isArray(item.subMappings) && item.subMappings.length > 0) {
      return item.subMappings;
    }
    if (item.ageGroup || item.minAge != null || item.maxAge != null) {
      return [
        {
          name: item.ageGroup || "Default",
          minAge: item.minAge,
          maxAge: item.maxAge,
        },
      ];
    }
    return [];
  };

  const formatSubMappingItem = (sub: SubMappingItem) => {
    const min = sub.minAge != null ? Number(sub.minAge) : null;
    const max = sub.maxAge != null ? Number(sub.maxAge) : null;
    if (min != null && max != null) return `Ages ${min}–${max}`;
    if (min != null) return `Age ${min}+`;
    if (max != null) return `Up to Age ${max}`;
    return "";
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-4 space-y-2">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Practice Paper Mapping
          </h3>
          <p className="text-xs text-muted-foreground">
            Map competition practice paper codes to student academic streams, levels, and age sub mappings.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
          <PlusCircle className="h-4 w-4" />
          Assign Paper
        </Button>
      </div>

      {/* Mappings Table */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Assigned Mappings</CardTitle>
          <CardDescription className="text-xs">
            Current practice paper assignments across all streams and levels. Expand a paper row to view sub mappings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[180px] font-bold">Paper</TableHead>
                <TableHead className="font-bold">Assigned Level</TableHead>
                <TableHead className="w-[140px] text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground text-xs">
                    Loading practice paper mappings...
                  </TableCell>
                </TableRow>
              ) : mappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground text-xs">
                    No practice paper mappings configured yet. Click "+ Assign Paper" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                mappings.map((item) => {
                  const isExpanded = !!expandedIds[item.id];
                  const subList = getSubMappingsListForItem(item);
                  return (
                    <React.Fragment key={item.id}>
                      <TableRow
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => toggleExpand(item.id)}
                      >
                        <TableCell className="font-bold text-sm font-mono text-primary">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(item.id);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <Badge variant="outline" className="bg-background border-primary/30 text-primary font-mono text-xs px-2.5 py-1">
                              {item.paper}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          <div className="flex items-center gap-2 text-foreground">
                            <span className="font-semibold text-primary">{item.stream}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{item.level}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(item.id)}
                              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
                            >
                              {isExpanded ? "Hide Sub" : `View Sub (${subList.length})`}
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/competitions/rules/${item.id}`)}
                              className="text-xs text-primary hover:text-primary hover:bg-primary/10 h-8 px-2.5 flex items-center gap-1"
                            >
                              <Settings className="h-3.5 w-3.5" />
                              <span>Set Rules</span>
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenEdit(item);
                              }}
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                              title="Edit Mapping"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={deleteMutation.isPending}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (item.id != null) {
                                  deleteMutation.mutate({ id: item.id, paperName: item.paper });
                                }
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                              title="Delete Mapping"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Sub Mapping Panel */}
                      {isExpanded && (
                        <TableRow className="bg-muted/15 hover:bg-muted/20 border-t border-border/40">
                          <TableCell colSpan={3} className="py-3 px-6">
                            <div className="flex flex-col gap-2">
                              <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                                Sub Mappings ({subList.length}):
                              </span>
                              {subList.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {subList.map((sub, idx) => {
                                    const ageStr = formatSubMappingItem(sub);
                                    return (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="bg-background/90 text-foreground font-mono text-xs px-3 py-1 border border-border/80 shadow-2xs flex items-center gap-1.5"
                                      >
                                        <span className="font-bold text-primary">{sub.name || `Sub #${idx + 1}`}</span>
                                        {ageStr && <span className="text-muted-foreground font-normal">({ageStr})</span>}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">
                                  No sub-mappings configured for this paper.
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && !isLoading && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-border/60">
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} mappings
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronFirst className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {buildPaginationPages(page, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <span
                      key={`e-${i}`}
                      className="flex h-8 w-8 items-center justify-center text-muted-foreground text-xs"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </span>
                  ) : (
                    <Button
                      type="button"
                      key={p}
                      variant={page === p ? "default" : "outline"}
                      size="sm"
                      className="h-8 min-w-[2rem] text-xs"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign / Edit Paper Dialog Modal */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        else setIsDialogOpen(true);
      }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingMapping ? "Edit Practice Paper Mapping" : "Assign Practice Paper"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingMapping
                  ? "Update paper code, stream, level, and multiple sub mapping names or age ranges."
                  : "Select or enter a practice paper code and map it to a stream, level, and multiple sub mappings."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Practice Paper Input */}
              <div className="space-y-1.5">
                <Label htmlFor="paperCode" className="text-xs font-semibold text-foreground">
                  Practice Paper
                </Label>
                <div className="relative">
                  <Input
                    id="paperCode"
                    placeholder="E.g. F, A-K, GL-1"
                    value={paperCode}
                    onChange={(e) => setPaperCode(e.target.value)}
                    className="h-10 uppercase font-mono"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              {/* Assign To Group Header */}
              <div className="pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Assign To
                </h4>

                <div className="space-y-3">
                  {/* Stream */}
                  <div className="space-y-1.5">
                    <Label htmlFor="stream" className="text-xs font-semibold text-foreground">
                      Stream
                    </Label>
                    <Select
                      value={stream}
                      onValueChange={(val) => {
                        setStream(val);
                        const matchingStream = streamsList.find((s) => s.name.toLowerCase() === val.toLowerCase());
                        if (matchingStream && levelsList.length > 0) {
                          const firstLvl = levelsList.find((l) => l.streamId === matchingStream.id);
                          if (firstLvl) setLevel(firstLvl.name);
                        }
                      }}
                    >
                      <SelectTrigger id="stream" className="h-10">
                        <SelectValue placeholder="Select Stream" />
                      </SelectTrigger>
                      <SelectContent>
                        {streamsList.length > 0 ? (
                          streamsList.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name} {s.levelCount ? `(${s.levelCount} levels)` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Elementary">Elementary (6 levels)</SelectItem>
                            <SelectItem value="Regular">Regular (10 levels)</SelectItem>
                            <SelectItem value="Grandmaster">Grandmaster (3 levels)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Level */}
                  <div className="space-y-1.5">
                    <Label htmlFor="level" className="text-xs font-semibold text-foreground">
                      Level
                    </Label>
                    <Select value={level} onValueChange={(val) => { setLevel(val); setMonth(null); }}>
                      <SelectTrigger id="level" className="h-10">
                        <SelectValue placeholder="Select Level" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLevels.length > 0 ? (
                          availableLevels.map((l) => (
                            <SelectItem key={l.id} value={l.name}>
                              {l.name} {l.code ? `(${l.code})` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Level 1">Level 1</SelectItem>
                            <SelectItem value="Level 2">Level 2</SelectItem>
                            <SelectItem value="Level 3">Level 3</SelectItem>
                            <SelectItem value="Level 4">Level 4</SelectItem>
                            <SelectItem value="Level 5">Level 5</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">
                      Level eligibility
                    </Label>
                    <ToggleField
                      variant="inline"
                      value={levelMatchMode}
                      onValueChange={(value) => {
                        setLevelMatchMode(value);
                        if (value === "completed_level") {
                          setMonth(null);
                        }
                      }}
                      options={[
                        { value: "at_level", label: "At level" },
                        { value: "completed_level", label: "Completed" },
                      ]}
                    />
                  </div>

                  {levelMatchMode === "at_level" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="month" className="text-xs font-semibold text-foreground">
                      Month
                    </Label>
                    <Select
                      value={month !== null && month !== undefined ? String(month) : ""}
                      onValueChange={(val) => setMonth(Number(val))}
                      required
                    >
                      <SelectTrigger id="month" className="h-10">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            Month {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  ) : null}

                  {/* Dynamic Sub Mappings Section */}
                  <div className="pt-3 border-t border-border/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Sub Mappings
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSubMapping}
                        className="h-7 text-xs font-semibold gap-1 text-primary hover:text-primary border-primary/30"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add Sub Mapping
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {subMappingsList.map((sub, index) => (
                        <div key={index} className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-muted-foreground">
                              Sub Mapping #{index + 1}
                            </span>
                            {subMappingsList.length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveSubMapping(index)}
                                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Remove sub mapping"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-foreground">
                                Sub Name
                              </Label>
                              <Input
                                placeholder="E.g. A1, B1"
                                value={sub.name}
                                onChange={(e) => handleUpdateSubMapping(index, "name", e.target.value)}
                                className="h-9 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-foreground">
                                From Age
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                max="99"
                                placeholder="5"
                                value={sub.minAge || ""}
                                onChange={(e) => handleUpdateSubMapping(index, "minAge", e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-foreground">
                                To Age
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                max="99"
                                placeholder="6"
                                value={sub.maxAge || ""}
                                onChange={(e) => handleUpdateSubMapping(index, "maxAge", e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="font-semibold">
                {isSaving ? "Saving..." : editingMapping ? "Update Mapping" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
