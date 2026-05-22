"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleField } from "@/components/shared/toggle-field";
import {
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Check,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getLevelsByStream,
  createLevel,
  updateLevel,
  deleteLevel,
  type Level,
  type CreateLevelDto,
  type UpdateLevelDto,
} from "@/services/level.service";
import {
  getTransitionsByProgram,
  type StreamTransition,
} from "@/services/stream-transition.service";
import {
  getStreamsByProgram,
  type Stream,
} from "@/services/stream.service";
import { getQueryClientBridge } from "@/hooks/api/query-client-bridge";
import { queryKeys } from "@/hooks/api/query-keys";
import {
  ConfirmDialog,
  DialogFormField,
  DialogFormGrid,
  FormDialog,
} from "@/components/shared/dialog";
import { LevelMaterialsPicker } from "./LevelMaterialsPicker";
import { StatusBadge } from "@/components/shared/status-badge";

function sortLevelsByDisplayOrder(list: Level[]) {
  return [...list].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.id - b.id;
  });
}

const STREAM_TABLE_CLASS = "w-full table-fixed text-sm";
const TH_NUM = "w-14 px-2 py-3 text-left font-medium text-gray-700";
const TH_LEVEL =
  "w-[28%] min-w-0 px-2 py-3 text-left font-medium text-gray-700";
const TH_DETAILS = "w-[20%] px-2 py-3 text-left font-medium text-gray-700";
const TH_MATERIALS =
  "min-w-0 w-[30%] px-2 py-3 text-left font-medium text-gray-700";
const TH_ACTIONS =
  "w-[200px] px-2 py-3 text-right font-medium text-gray-700 box-border";
const TD_NUM = "w-14 px-2 py-3 text-gray-600 font-medium align-top";
const TD_LEVEL = "min-w-0 px-2 py-3 align-top";
const TD_DETAILS = "w-[20%] px-2 py-3 text-xs text-gray-500 align-top";
const TD_MATERIALS = "min-w-0 px-2 py-3 align-top";
const TD_ACTIONS = "w-[200px] px-2 py-3 text-right align-top box-border";

interface LevelManagementProps {
  programId: number;
  programName: string;
  initialStreams?: Stream[];
  initialTransitions?: StreamTransition[];
  skipCatalogLoad?: boolean;
  catalogVersion?: number;
}

export function LevelManagement({
  programId,
  programName,
  initialStreams,
  initialTransitions,
  skipCatalogLoad = false,
  catalogVersion = 0,
}: LevelManagementProps) {
  const [streams, setStreams] = useState<Stream[]>(initialStreams ?? []);
  const [transitions, setTransitions] = useState<StreamTransition[]>(
    initialTransitions ?? [],
  );
  const [isLoading, setIsLoading] = useState(
    skipCatalogLoad ? false : !(initialStreams && initialTransitions),
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<Level | null>(null);
  const [streamLevels, setStreamLevels] = useState<Record<number, Level[]>>({});
  const [loadingStreamLevels, setLoadingStreamLevels] = useState<
    Record<number, boolean>
  >({});
  const [loadedStreamLevels, setLoadedStreamLevels] = useState<
    Record<number, boolean>
  >({});
  const [collapsedStreams, setCollapsedStreams] = useState<
    Record<number, boolean>
  >({});
  const [formData, setFormData] = useState<Omit<CreateLevelDto, "programId">>({
    name: "",
    code: "",
    streamId: 0,
    totalMarks: 100,
    passMark: 40,
    displayOrder: 1,
    durationInMonths: 3,
    isActive: true,
  });

  const [editFormData, setEditFormData] = useState<UpdateLevelDto>({});

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextStreams, nextTransitions] = await Promise.all([
        getStreamsByProgram(programId),
        getTransitionsByProgram(programId).catch(
          () => [] as StreamTransition[],
        ),
      ]);
      setStreams(nextStreams);
      setTransitions(nextTransitions);
    } catch {
      toast.error("Failed to load catalog");
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    if (skipCatalogLoad) return;
    void loadCatalog();
  }, [catalogVersion, loadCatalog, skipCatalogLoad]);

  useEffect(() => {
    if (!skipCatalogLoad) return;
    setStreams(initialStreams ?? []);
    setTransitions(initialTransitions ?? []);
    setIsLoading(false);
  }, [initialStreams, initialTransitions, skipCatalogLoad]);

  useEffect(() => {
    setCollapsedStreams((prev) =>
      Object.fromEntries(
        streams.map((stream) => [stream.id, prev[stream.id] ?? true]),
      ),
    );

    const validIds = new Set(streams.map((stream) => stream.id));
    setStreamLevels((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([streamId]) =>
          validIds.has(Number(streamId)),
        ),
      ),
    );
    setLoadedStreamLevels((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([streamId]) =>
          validIds.has(Number(streamId)),
        ),
      ),
    );
    setLoadingStreamLevels((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([streamId]) =>
          validIds.has(Number(streamId)),
        ),
      ),
    );
  }, [streams]);

  const loadLevelsForStream = useCallback(
    async (streamId: number, force = false): Promise<Level[]> => {
      if (!force && loadedStreamLevels[streamId]) {
        return streamLevels[streamId] ?? [];
      }

      setLoadingStreamLevels((prev) => ({ ...prev, [streamId]: true }));
      try {
        const nextLevels = sortLevelsByDisplayOrder(
          await getQueryClientBridge().fetchQuery({
            queryKey: queryKeys.levels.byStream(streamId),
            queryFn: () => getLevelsByStream(streamId),
            staleTime: Number.POSITIVE_INFINITY,
          }),
        );
        setStreamLevels((prev) => ({ ...prev, [streamId]: nextLevels }));
        setLoadedStreamLevels((prev) => ({ ...prev, [streamId]: true }));
        setStreams((prev) =>
          prev.map((stream) =>
            stream.id === streamId
              ? { ...stream, levelCount: nextLevels.length }
              : stream,
          ),
        );
        return nextLevels;
      } catch {
        toast.error("Failed to load levels for this stream");
        return streamLevels[streamId] ?? [];
      } finally {
        setLoadingStreamLevels((prev) => ({ ...prev, [streamId]: false }));
      }
    },
    [loadedStreamLevels, streamLevels],
  );

  const toggleStreamCollapse = (streamId: number) => {
    const isCollapsed = collapsedStreams[streamId] ?? true;
    if (isCollapsed) {
      void loadLevelsForStream(streamId);
    }
    setCollapsedStreams((prev) => ({
      ...prev,
      [streamId]: !prev[streamId],
    }));
  };

  const nextDisplayOrderForStream = (levelsForStream: Level[]) => {
    if (levelsForStream.length === 0) return 1;
    return Math.max(...levelsForStream.map((level) => level.displayOrder)) + 1;
  };

  const openAddForStream = async (streamId: number) => {
    const levelsForStream =
      streamId > 0 ? await loadLevelsForStream(streamId) : [];
    setFormData({
      name: "",
      code: "",
      streamId,
      totalMarks: 100,
      passMark: 40,
      displayOrder: nextDisplayOrderForStream(levelsForStream),
      durationInMonths: 3,
      isActive: true,
    });
    setIsAddDialogOpen(true);
  };

  const handleAddLevel = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    if (!formData.streamId || formData.streamId === 0) {
      toast.error("Select a stream (create one in Streams & transitions first)");
      return;
    }
    const totalMarks = formData.totalMarks ?? 0;
    const passMark = formData.passMark ?? 0;
    if (totalMarks <= 0) {
      toast.error("Total marks must be greater than 0");
      return;
    }
    if (passMark <= 0 || passMark > totalMarks) {
      toast.error("Pass mark must be between 1 and total marks");
      return;
    }
    if (!formData.durationInMonths || formData.durationInMonths <= 0) {
      toast.error("Duration must be at least 1 month");
      return;
    }

    try {
      const created = await createLevel({
        ...formData,
        programId,
      });
      await getQueryClientBridge().invalidateQueries({
        queryKey: queryKeys.levels.byStream(created.streamId),
      });
      await loadLevelsForStream(created.streamId, true);
      toast.success("Level created");
      setIsAddDialogOpen(false);
    } catch {
      toast.error("Failed to create level");
    }
  };

  const handleEditLevel = async () => {
    if (!editingLevel) return;

    try {
      const previousStreamId = editingLevel.streamId;
      const updated = await updateLevel(editingLevel.id, editFormData);
      await Promise.all([
        getQueryClientBridge().invalidateQueries({
          queryKey: queryKeys.levels.byStream(previousStreamId),
        }),
        updated.streamId !== previousStreamId
          ? getQueryClientBridge().invalidateQueries({
              queryKey: queryKeys.levels.byStream(updated.streamId),
            })
          : Promise.resolve(),
      ]);
      await Promise.all([
        loadLevelsForStream(previousStreamId, true),
        updated.streamId !== previousStreamId
          ? loadLevelsForStream(updated.streamId, true)
          : Promise.resolve([] as Level[]),
      ]);
      toast.success("Level updated");
      setIsEditDialogOpen(false);
      setEditingLevel(null);
      setEditFormData({});
    } catch {
      toast.error("Failed to update level");
    }
  };

  const handleDeleteLevel = async () => {
    if (!deletingLevel) return;

    try {
      await deleteLevel(deletingLevel.id);
      await getQueryClientBridge().invalidateQueries({
        queryKey: queryKeys.levels.byStream(deletingLevel.streamId),
      });
      await loadLevelsForStream(deletingLevel.streamId, true);
      toast.success("Level deleted");
      setIsDeleteDialogOpen(false);
      setDeletingLevel(null);
    } catch {
      toast.error("Failed to delete level (students may be enrolled)");
    }
  };

  const totalLevels = streams.reduce(
    (sum, stream) =>
      sum + (stream.levelCount ?? streamLevels[stream.id]?.length ?? 0),
    0,
  );

  const formatAgeRange = (stream: Stream) => {
    if (stream.minAge == null && stream.maxAge == null) return "Any age";
    return `Ages ${stream.minAge ?? "—"}–${stream.maxAge ?? "—"}`;
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-card-foreground">
              Level ladder
            </h3>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 font-normal text-primary"
            >
              {programName} · {totalLevels} levels
            </Badge>
          </div>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Expand a stream to load and manage its levels, materials, and
            completion flow. Drag levels to reorder; mark optional levels with a
            star.
          </p>
        </div>
      </header>

      {/* Body */}
      <div className="px-4 py-4 sm:px-5">
        {streams.length === 0 && !isLoading ? (
          <p className="text-xs text-amber-700">
            Add at least one stream before creating levels.
          </p>
        ) : null}

        {isLoading ? (
          <div className="py-6 text-sm text-muted-foreground">
            Loading ladder…
          </div>
        ) : streams.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
            No streams yet. Add a stream first to start building levels.
          </div>
        ) : (
          <div className="space-y-3">
            {streams.map((stream) => {
              const levelsForStream = sortLevelsByDisplayOrder(
                streamLevels[stream.id] ?? [],
              );
              const hasOutgoingTransition = transitions.some(
                (transition) => transition.fromStreamId === stream.id,
              );
              const maxInStream =
                levelsForStream.length === 0
                  ? 0
                  : Math.max(
                      ...levelsForStream.map((level) => level.displayOrder),
                    );
              const levelCount = stream.levelCount ?? levelsForStream.length;
              const totalMonths = levelsForStream.reduce(
                (sum, level) => sum + (level.durationInMonths ?? 3),
                0,
              );
              const isCollapsed = collapsedStreams[stream.id];

              return (
                <div
                  key={stream.id}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleStreamCollapse(stream.id)}
                      aria-expanded={!isCollapsed}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isCollapsed ? "" : "rotate-90"
                        }`}
                      />
                      <span className="font-semibold text-card-foreground">
                        {stream.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="rounded-full border-border bg-card font-normal text-muted-foreground"
                      >
                        {levelCount} levels
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        · {formatAgeRange(stream)}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-3">
                      {!isCollapsed && totalMonths > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Total{" "}
                          <span className="font-semibold text-card-foreground">
                            {totalMonths} mo
                          </span>
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-md text-primary hover:bg-primary/10"
                        onClick={() => void openAddForStream(stream.id)}
                        disabled={isLoading}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add level
                      </Button>
                    </div>
                  </div>
                  {isCollapsed ? null : loadingStreamLevels[stream.id] ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      Loading levels…
                    </p>
                  ) : levelsForStream.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      No levels in this stream yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed text-sm">
                        <colgroup>
                          <col className="w-[26%]" />
                          <col className="w-[22%]" />
                          <col className="w-[22%]" />
                          <col className="w-[16%]" />
                          <col className="w-[14%]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-border bg-muted/20">
                            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Level
                            </th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Details
                            </th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Materials
                            </th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Status
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {levelsForStream.map((level) => {
                            const showStar =
                              hasOutgoingTransition &&
                              maxInStream > 0 &&
                              level.displayOrder === maxInStream;

                            return (
                              <tr
                                key={level.id}
                                className="border-b border-border last:border-b-0 align-middle hover:bg-muted/10"
                              >
                                <td className="px-3 py-2 align-middle">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-muted/60 px-1.5 text-[11px] font-medium text-muted-foreground">
                                      #{level.displayOrder}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1 font-medium text-card-foreground">
                                        <span className="truncate">
                                          {level.name}
                                        </span>
                                        {showStar ? (
                                          <Star
                                            className="h-3.5 w-3.5 text-amber-500"
                                            fill="currentColor"
                                            aria-label="Optional / bridge level"
                                          />
                                        ) : null}
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {level.code}
                                        {showStar
                                          ? ` · bridges to ${
                                              streams.find(
                                                (s) =>
                                                  s.id ===
                                                  transitions.find(
                                                    (t) =>
                                                      t.fromStreamId ===
                                                      stream.id,
                                                  )?.toStreamId,
                                              )?.name ?? ""
                                            }`
                                          : ""}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className="gap-1 rounded-full border-border bg-card font-normal text-card-foreground"
                                    >
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      {level.durationInMonths ?? 3} mo
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="gap-1 rounded-full border-border bg-card font-normal text-card-foreground"
                                    >
                                      <Check className="h-3 w-3 text-primary" />
                                      Pass {level.passMark} / {level.totalMarks}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <LevelMaterialsPicker
                                    levelId={level.id}
                                    disabled={isLoading}
                                  />
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <StatusBadge
                                    label={level.isActive ? "Active" : "Inactive"}
                                  />
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 rounded-md p-0"
                                      onClick={() => {
                                        setEditingLevel(level);
                                        setEditFormData({
                                          name: level.name,
                                          code: level.code,
                                          streamId: level.streamId,
                                          programId,
                                          totalMarks: level.totalMarks,
                                          passMark: level.passMark,
                                          displayOrder: level.displayOrder,
                                          durationInMonths:
                                            level.durationInMonths,
                                          isActive: level.isActive,
                                        });
                                        setIsEditDialogOpen(true);
                                      }}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 rounded-md p-0 text-destructive"
                                      onClick={() => {
                                        setDeletingLevel(level);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend + tip footer */}
      {streams.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-primary" />
              Materials loaded
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-muted-foreground/40" />
              Not yet loaded
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star
                className="h-3 w-3 text-amber-500"
                fill="currentColor"
              />
              Optional / bridge level
            </span>
          </div>
          <span className="text-muted-foreground">
            Tip: hold{" "}
            <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[10px]">
              ⌥
            </kbd>{" "}
            while dragging to copy a level across streams.
          </span>
        </div>
      ) : null}

      <FormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        size="md"
        title="Add level"
        description={`Create a new step in ${programName}. Stream and display order are set automatically for this row.`}
        headerIcon={Plus}
        onSubmit={(e) => {
          e.preventDefault();
          void handleAddLevel();
        }}
        submitLabel="Create"
      >
        <DialogFormField label="Stream">
          <Input
            value={
              streams.find((stream) => stream.id === formData.streamId)?.name ??
              ""
            }
            readOnly
            disabled
          />
        </DialogFormField>
        <DialogFormGrid cols={2}>
          <DialogFormField id="addLevelName" label="Level" required>
            <Input
              id="addLevelName"
              value={formData.name}
              placeholder="e.g., Level 1"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              onKeyDown={(e) => e.key === "Enter" && void handleAddLevel()}
            />
          </DialogFormField>
          <DialogFormField id="addLevelCode" label="Code" required>
            <Input
              id="addLevelCode"
              value={formData.code}
              placeholder="e.g., L1"
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              onKeyDown={(e) => e.key === "Enter" && void handleAddLevel()}
            />
          </DialogFormField>
        </DialogFormGrid>
        <DialogFormGrid cols={2}>
          <DialogFormField label="Total marks" required>
            <Input
              type="number"
              min={0}
              value={formData.totalMarks === 0 ? "" : formData.totalMarks}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({
                  ...formData,
                  totalMarks: value === "" ? 0 : Number(value),
                });
              }}
            />
          </DialogFormField>
          <DialogFormField label="Pass mark" required>
            <Input
              type="number"
              min={0}
              value={formData.passMark === 0 ? "" : formData.passMark}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({
                  ...formData,
                  passMark: value === "" ? 0 : Number(value),
                });
              }}
            />
          </DialogFormField>
        </DialogFormGrid>
        <DialogFormField label="Duration (months)" required>
          <Input
            type="number"
            min={1}
            value={
              formData.durationInMonths === 0 ? "" : formData.durationInMonths
            }
            onChange={(e) => {
              const value = e.target.value;
              setFormData({
                ...formData,
                durationInMonths: value === "" ? 0 : Number(value),
              });
            }}
          />
        </DialogFormField>
        <ToggleField
          label="Status"
          value={formData.isActive ? "active" : "inactive"}
          onValueChange={(v) =>
            setFormData({ ...formData, isActive: v === "active" })
          }
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          This will be added as position #{formData.displayOrder} in the
          selected stream.
        </div>
      </FormDialog>

      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        size="md"
        title="Edit level"
        headerIcon={Edit2}
        onSubmit={(e) => {
          e.preventDefault();
          void handleEditLevel();
        }}
        submitLabel="Save"
      >
        <DialogFormField label="Stream">
            <Select
                value={
                  editFormData.streamId != null && editFormData.streamId > 0
                    ? String(editFormData.streamId)
                    : undefined
                }
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    streamId: Number(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stream" />
              </SelectTrigger>
              <SelectContent>
                {streams.map((stream) => (
                  <SelectItem key={stream.id} value={String(stream.id)}>
                    {stream.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </DialogFormField>
        <DialogFormGrid cols={2}>
          <DialogFormField label="Name">
            <Input
              value={editFormData.name || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
            />
          </DialogFormField>
          <DialogFormField label="Code">
            <Input
              value={editFormData.code || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, code: e.target.value })
              }
            />
          </DialogFormField>
        </DialogFormGrid>
        <DialogFormGrid cols={2}>
          <DialogFormField label="Total marks">
            <Input
              type="number"
              value={
                editFormData.totalMarks === 0 ||
                editFormData.totalMarks === undefined
                  ? ""
                  : editFormData.totalMarks
              }
              onChange={(e) => {
                const value = e.target.value;
                setEditFormData({
                  ...editFormData,
                  totalMarks: value === "" ? 0 : Number(value),
                });
              }}
            />
          </DialogFormField>
          <DialogFormField label="Pass mark">
            <Input
              type="number"
              value={
                editFormData.passMark === 0 ||
                editFormData.passMark === undefined
                  ? ""
                  : editFormData.passMark
              }
              onChange={(e) => {
                const value = e.target.value;
                setEditFormData({
                  ...editFormData,
                  passMark: value === "" ? 0 : Number(value),
                });
              }}
            />
          </DialogFormField>
        </DialogFormGrid>
        <DialogFormGrid cols={2}>
          <DialogFormField label="Display order">
            <Input
              type="number"
              value={
                editFormData.displayOrder === 0 ||
                editFormData.displayOrder === undefined
                  ? ""
                  : editFormData.displayOrder
              }
              onChange={(e) => {
                const value = e.target.value;
                setEditFormData({
                  ...editFormData,
                  displayOrder: value === "" ? 0 : Number(value),
                });
              }}
            />
          </DialogFormField>
          <DialogFormField label="Duration (months)">
            <Input
              type="number"
              min={1}
              value={
                editFormData.durationInMonths === 0 ||
                editFormData.durationInMonths === undefined
                  ? ""
                  : editFormData.durationInMonths
              }
              onChange={(e) => {
                const value = e.target.value;
                setEditFormData({
                  ...editFormData,
                  durationInMonths: value === "" ? 3 : Number(value),
                });
              }}
            />
          </DialogFormField>
        </DialogFormGrid>
        <ToggleField
          label="Status"
          value={(editFormData.isActive ?? false) ? "active" : "inactive"}
          onValueChange={(v) =>
            setEditFormData({ ...editFormData, isActive: v === "active" })
          }
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </FormDialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        variant="destructive"
        title="Delete level?"
        description={`Remove "${deletingLevel?.name}" and its inventory links.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDeleteLevel()}
      />
    </div>
  );
}
