"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getLevelsByStream,
  createLevel,
  updateLevel,
  deleteLevel,
  type Level,
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
  AddLevelDialog,
  EditLevelDialog,
  DeleteLevelDialog,
  type AddLevelFormData,
} from "@/app/admin/profile/components/LevelFormDialog";
import {
  LevelList,
  sortLevelsByDisplayOrder,
} from "@/app/admin/profile/components/LevelList";

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
  const [formData, setFormData] = useState<AddLevelFormData>({
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

  // ── Catalog loading ─────────────────────────────────────────────────────

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

  // ── Level loading ───────────────────────────────────────────────────────

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

  // ── CRUD handlers ───────────────────────────────────────────────────────

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
      const created = await createLevel({ ...formData, programId });
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

  // ── Render ──────────────────────────────────────────────────────────────

  const totalLevels = streams.reduce(
    (sum, stream) =>
      sum + (stream.levelCount ?? streamLevels[stream.id]?.length ?? 0),
    0,
  );

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

        <LevelList
          streams={streams}
          transitions={transitions}
          streamLevels={streamLevels}
          loadingStreamLevels={loadingStreamLevels}
          collapsedStreams={collapsedStreams}
          isLoading={isLoading}
          onToggleStreamCollapse={toggleStreamCollapse}
          onAddLevel={(streamId) => void openAddForStream(streamId)}
          onEditLevel={(level, data) => {
            setEditingLevel(level);
            setEditFormData(data);
            setIsEditDialogOpen(true);
          }}
          onDeleteLevel={(level) => {
            setDeletingLevel(level);
            setIsDeleteDialogOpen(true);
          }}
          programId={programId}
          showLegend
        />
      </div>

      {/* Dialogs */}
      <AddLevelDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        programName={programName}
        streams={streams}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={() => void handleAddLevel()}
      />
      <EditLevelDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        streams={streams}
        editFormData={editFormData}
        onEditFormDataChange={setEditFormData}
        onSubmit={() => void handleEditLevel()}
      />
      <DeleteLevelDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        deletingLevel={deletingLevel}
        onConfirm={() => void handleDeleteLevel()}
      />
    </div>
  );
}
