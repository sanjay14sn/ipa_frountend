"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, Plus, Trash2, Edit2, Package } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LevelMaterialsPicker } from "./LevelMaterialsPicker";

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
  const router = useRouter();
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Level ladder - {programName}
          </h3>
          <Badge variant="secondary">{totalLevels} levels</Badge>
        </div>
      </div>
      <p className="text-xs text-gray-600">
        Expand a stream to load and manage its levels, materials, and completion
        flow.
      </p>
      {streams.length === 0 && !isLoading ? (
        <p className="text-xs text-amber-700">
          Add at least one stream before creating levels.
        </p>
      ) : null}

      {isLoading ? (
        <div className="py-6 text-sm text-gray-500">Loading ladder...</div>
      ) : streams.length === 0 ? (
        <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-gray-500">
          No streams yet. Add a stream first to start building levels.
        </div>
      ) : (
        <div className="space-y-4">
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
                : Math.max(...levelsForStream.map((level) => level.displayOrder));
            const levelCount = stream.levelCount ?? levelsForStream.length;

            return (
              <div
                key={stream.id}
                className="overflow-x-auto rounded-lg border bg-white"
              >
                <div className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleStreamCollapse(stream.id)}
                    aria-expanded={!collapsedStreams[stream.id]}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                        collapsedStreams[stream.id] ? "" : "rotate-90"
                      }`}
                    />
                    <span className="font-medium text-gray-900">
                      {stream.name}
                    </span>
                    <Badge variant="secondary">{levelCount} levels</Badge>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => void openAddForStream(stream.id)}
                      disabled={isLoading}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add level
                    </Button>
                    <button
                      type="button"
                      onClick={() => toggleStreamCollapse(stream.id)}
                      aria-expanded={!collapsedStreams[stream.id]}
                      className="text-xs text-gray-500"
                    >
                      {collapsedStreams[stream.id] ? "Show levels" : "Hide levels"}
                    </button>
                  </div>
                </div>
                {collapsedStreams[stream.id] ? null : loadingStreamLevels[stream.id] ? (
                  <p className="p-3 text-sm text-gray-500">Loading levels...</p>
                ) : levelsForStream.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">
                    No levels in this stream yet.
                  </p>
                ) : (
                  <table className={STREAM_TABLE_CLASS}>
                    <colgroup>
                      <col className="w-14" />
                      <col className="w-[28%]" />
                      <col className="w-[20%]" />
                      <col className="w-[30%]" />
                      <col className="w-[200px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className={TH_NUM}>#</th>
                        <th className={TH_LEVEL}>Level</th>
                        <th className={TH_DETAILS}>Details</th>
                        <th className={TH_MATERIALS}>Materials</th>
                        <th className={TH_ACTIONS}>Actions</th>
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
                            className="border-b border-gray-100 align-top"
                          >
                            <td className={TD_NUM}>{level.displayOrder}</td>
                            <td className={TD_LEVEL}>
                              <div className="flex flex-wrap items-center gap-1 break-words font-medium text-gray-900">
                                {level.name}
                                {showStar ? (
                                  <span
                                    title="Stream has a completion transition configured"
                                    className="text-amber-600"
                                  >
                                    *
                                  </span>
                                ) : null}
                                {!level.isActive ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    Off
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="break-all text-xs text-gray-500">
                                {level.code}
                              </div>
                            </td>
                            <td className={TD_DETAILS}>
                              {level.durationInMonths ?? 3} mo · pass{" "}
                              {level.passMark}/{level.totalMarks}
                            </td>
                            <td className={TD_MATERIALS}>
                              <LevelMaterialsPicker
                                levelId={level.id}
                                disabled={isLoading}
                              />
                            </td>
                            <td className={TD_ACTIONS}>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 rounded-md p-0"
                                  title="Open inventory catalog"
                                  onClick={() =>
                                    router.push(
                                      `/admin/operations?tab=inventory&programId=${programId}&levelId=${level.id}`,
                                    )
                                  }
                                >
                                  <Package className="h-3.5 w-3.5" />
                                </Button>
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
                                      durationInMonths: level.durationInMonths,
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
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add level</DialogTitle>
            <DialogDescription>
              Create a new step in {programName}. Stream and display order are
              set automatically for this row.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stream</Label>
              <Input
                value={
                  streams.find((stream) => stream.id === formData.streamId)
                    ?.name ?? ""
                }
                readOnly
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Level</Label>
                <Input
                  value={formData.name}
                  placeholder="e.g., Level 1"
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && void handleAddLevel()}
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={formData.code}
                  placeholder="e.g., L1"
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && void handleAddLevel()}
                />
              </div>
            </div>
            <div className="rounded-md border border-dashed bg-gray-50 px-3 py-2 text-xs text-gray-600">
              This will be added as position #{formData.displayOrder} in the
              selected stream.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddLevel()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stream</Label>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editFormData.name || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={editFormData.code || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, code: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total marks</Label>
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
              </div>
              <div className="space-y-2">
                <Label>Pass mark</Label>
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
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display order</Label>
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
              </div>
              <div className="space-y-2">
                <Label>Duration (months)</Label>
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
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={editFormData.isActive ?? false}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, isActive: checked })
                }
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleEditLevel()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete level?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deletingLevel?.name}&quot; and its inventory links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteLevel()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
