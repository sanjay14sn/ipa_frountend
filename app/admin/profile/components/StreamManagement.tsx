"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  getStreamsByProgram,
  createStream,
  updateStream,
  deleteStream,
  type Stream,
  type CreateStreamDto,
  type UpdateStreamDto,
} from "@/services/stream.service";
import {
  getTransitionsByProgram,
  createStreamTransition,
  updateStreamTransition,
  deleteStreamTransition,
  type StreamTransition,
} from "@/services/stream-transition.service";
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
import { invalidateStreamsByProgram } from "@/hooks/api/stream.hooks";
import { invalidateStreamTransitionsByProgram } from "@/hooks/api/stream-transition.hooks";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";

interface StreamManagementProps {
  programId: number;
  programName: string;
  /** Narrow sidebar layout when nested under program ladder */
  compact?: boolean;
  initialStreams?: Stream[];
  initialTransitions?: StreamTransition[];
  skipInitialLoad?: boolean;
  /** Bump parent state so level ladder refetches streams/transitions */
  onCatalogChange?: () => void;
}

export function StreamManagement({
  programId,
  programName,
  compact,
  initialStreams,
  initialTransitions,
  skipInitialLoad,
  onCatalogChange,
}: StreamManagementProps) {
  const [streams, setStreams] = useState<Stream[]>(initialStreams ?? []);
  const [transitions, setTransitions] = useState<StreamTransition[]>(
    initialTransitions ?? [],
  );
  const [isLoading, setIsLoading] = useState(
    skipInitialLoad ? false : !(initialStreams && initialTransitions),
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [deletingStream, setDeletingStream] = useState<Stream | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
    minAge: "" as string,
    maxAge: "" as string,
    displayOrder: "" as string,
  });
  const [editFormData, setEditFormData] = useState<UpdateStreamDto>({});

  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [editingTransition, setEditingTransition] =
    useState<StreamTransition | null>(null);
  const [transitionForm, setTransitionForm] = useState({
    fromStreamId: "",
    toStreamId: "",
    toLevelDisplayOrder: "1",
  });
  const [deletingTransition, setDeletingTransition] =
    useState<StreamTransition | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, t] = await Promise.all([
        getStreamsByProgram(programId),
        getTransitionsByProgram(programId),
      ]);
      setStreams(s);
      setTransitions(t);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load streams or transitions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [programId, toast]);

  useEffect(() => {
    if (skipInitialLoad) return;
    void loadAll();
  }, [loadAll, skipInitialLoad]);

  useEffect(() => {
    if (!skipInitialLoad) return;
    setStreams(initialStreams ?? []);
    setTransitions(initialTransitions ?? []);
    setIsLoading(false);
  }, [initialStreams, initialTransitions, skipInitialLoad]);

  const notifyParent = () => {
    onCatalogChange?.();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      isActive: true,
      minAge: "",
      maxAge: "",
      displayOrder: "",
    });
  };

  const parseOptInt = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const handleAddStream = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Stream name is required",
        variant: "destructive",
      });
      return;
    }
    const payload: CreateStreamDto = {
      name: formData.name.trim(),
      programId,
      isActive: formData.isActive,
      minAge: parseOptInt(formData.minAge),
      maxAge: parseOptInt(formData.maxAge),
      displayOrder: Number(formData.displayOrder) || 0,
    };
    try {
      await createStream(payload);
      await invalidateStreamsByProgram(programId);
      toast({ title: "Success", description: "Stream created" });
      resetForm();
      setIsAddDialogOpen(false);
      await loadAll();
      notifyParent();
    } catch {
      toast({
        title: "Error",
        description: "Failed to create stream",
        variant: "destructive",
      });
    }
  };

  const handleEditStream = async () => {
    if (!editingStream) return;
    try {
      await updateStream(editingStream.id, editFormData);
      await invalidateStreamsByProgram(programId);
      toast({ title: "Success", description: "Stream updated" });
      setIsEditDialogOpen(false);
      setEditingStream(null);
      setEditFormData({});
      await loadAll();
      notifyParent();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update stream",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStream = async () => {
    if (!deletingStream) return;
    try {
      await deleteStream(deletingStream.id);
      await invalidateStreamsByProgram(programId);
      toast({ title: "Success", description: "Stream deleted" });
      setIsDeleteDialogOpen(false);
      setDeletingStream(null);
      await loadAll();
      notifyParent();
    } catch {
      toast({
        title: "Error",
        description:
          "Failed to delete stream. Remove levels first, or check permissions.",
        variant: "destructive",
      });
    }
  };

  const openAddTransition = () => {
    setEditingTransition(null);
    setTransitionForm({
      fromStreamId: streams[0]?.id?.toString() ?? "",
      toStreamId: streams[1]?.id?.toString() ?? streams[0]?.id?.toString() ?? "",
      toLevelDisplayOrder: "1",
    });
    setIsTransitionDialogOpen(true);
  };

  const openEditTransition = (t: StreamTransition) => {
    setEditingTransition(t);
    setTransitionForm({
      fromStreamId: String(t.fromStreamId),
      toStreamId: String(t.toStreamId),
      toLevelDisplayOrder: String(t.toLevelDisplayOrder),
    });
    setIsTransitionDialogOpen(true);
  };

  const saveTransition = async () => {
    const fromId = Number(transitionForm.fromStreamId);
    const toId = Number(transitionForm.toStreamId);
    const ord = Number(transitionForm.toLevelDisplayOrder);
    if (!fromId || !toId || !Number.isFinite(ord) || ord < 1) {
      toast({
        title: "Error",
        description: "Select streams and a valid target level order",
        variant: "destructive",
      });
      return;
    }
    try {
      if (editingTransition) {
        await updateStreamTransition(editingTransition.id, {
          fromStreamId: fromId,
          toStreamId: toId,
          toLevelDisplayOrder: ord,
          programId,
        });
        await invalidateStreamTransitionsByProgram(programId);
        toast({ title: "Success", description: "Transition updated" });
      } else {
        await createStreamTransition({
          programId,
          fromStreamId: fromId,
          toStreamId: toId,
          toLevelDisplayOrder: ord,
        });
        await invalidateStreamTransitionsByProgram(programId);
        toast({ title: "Success", description: "Transition added" });
      }
      setIsTransitionDialogOpen(false);
      setEditingTransition(null);
      await loadAll();
      notifyParent();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save transition (check target level exists)",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTransition = async () => {
    if (!deletingTransition) return;
    try {
      await deleteStreamTransition(deletingTransition.id);
      await invalidateStreamTransitionsByProgram(programId);
      toast({ title: "Success", description: "Transition removed" });
      setDeletingTransition(null);
      await loadAll();
      notifyParent();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete transition",
        variant: "destructive",
      });
    }
  };

  const streamName = (id: number) =>
    streams.find((s) => s.id === id)?.name ?? `#${id}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h3
              className={
                compact
                  ? "text-base font-semibold text-gray-900"
                  : "text-lg font-semibold text-gray-900"
              }
            >
              Streams & transitions
            </h3>
            <p className="text-xs text-gray-600">
              Manage stream ages and completion transitions for {programName}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-1" />
            Stream
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={openAddTransition}
            disabled={isLoading || streams.length < 1}
          >
            <GitBranch className="w-4 h-4 mr-1" />
            Transition
          </Button>
        </div>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg border bg-slate-50/70 p-4">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : streams.length === 0 ? (
          <p className="text-sm text-gray-500">No streams yet.</p>
        ) : (
          streams.map((stream) => (
            <div
              key={stream.id}
              className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-medium text-gray-900">{stream.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Order: {stream.displayOrder ?? 0}
                    {stream.minAge != null || stream.maxAge != null
                      ? ` · Age ${stream.minAge ?? "—"}–${stream.maxAge ?? "—"}`
                      : " · Age: any"}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-md p-0 hover:bg-white"
                    onClick={() => {
                      setEditingStream(stream);
                      setEditFormData({
                        name: stream.name,
                        isActive: stream.isActive ?? true,
                        minAge: stream.minAge ?? null,
                        maxAge: stream.maxAge ?? null,
                        displayOrder: stream.displayOrder ?? 0,
                        programId,
                      });
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-md p-0 text-destructive hover:bg-white"
                    onClick={() => {
                      setDeletingStream(stream);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {transitions.length > 0 && (
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="mb-2 text-xs font-semibold text-gray-700">
            Completion transitions
          </div>
          <ul className="space-y-2">
            {transitions.map((t) => (
              <li
                key={t.id}
                className="text-xs text-gray-700 flex justify-between gap-2 items-center"
              >
                <span>
                  <Badge variant="outline" className="mr-1 font-normal">
                    {streamName(t.fromStreamId)}
                  </Badge>
                  →
                  <Badge variant="outline" className="mx-1 font-normal">
                    {streamName(t.toStreamId)}
                  </Badge>
                  @ order {t.toLevelDisplayOrder}
                </span>
                <span className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => openEditTransition(t)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive"
                    onClick={() => setDeletingTransition(t)}
                  >
                    Del
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add stream</DialogTitle>
            <DialogDescription>For {programName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Elementary"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Min age</Label>
                <Input
                  value={formData.minAge}
                  onChange={(e) =>
                    setFormData({ ...formData, minAge: e.target.value })
                  }
                  placeholder="optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Max age</Label>
                <Input
                  value={formData.maxAge}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAge: e.target.value })
                  }
                  placeholder="optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Display order</Label>
              <Input
                type="number"
                min={0}
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: e.target.value })
                }
                onFocus={selectInputValueOnFocus}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(c) =>
                  setFormData({ ...formData, isActive: c })
                }
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStream}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit stream</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editFormData.name ?? ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Min age</Label>
                <Input
                  value={
                    editFormData.minAge === null ||
                    editFormData.minAge === undefined
                      ? ""
                      : String(editFormData.minAge)
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditFormData({
                      ...editFormData,
                      minAge: v === "" ? null : Number(v),
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Max age</Label>
                <Input
                  value={
                    editFormData.maxAge === null ||
                    editFormData.maxAge === undefined
                      ? ""
                      : String(editFormData.maxAge)
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditFormData({
                      ...editFormData,
                      maxAge: v === "" ? null : Number(v),
                    });
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Display order</Label>
              <Input
                type="number"
                value={
                  editFormData.displayOrder === undefined ||
                  editFormData.displayOrder === null
                    ? ""
                    : String(editFormData.displayOrder)
                }
                onChange={(e) => {
                  const v = e.target.value;
                  setEditFormData({
                    ...editFormData,
                    displayOrder: v === "" ? undefined : Number(v),
                  });
                }}
                onFocus={selectInputValueOnFocus}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editFormData.isActive ?? true}
                onCheckedChange={(c) =>
                  setEditFormData({ ...editFormData, isActive: c })
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
            <Button onClick={handleEditStream}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stream?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deletingStream?.name}&quot; (no levels must remain).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStream}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isTransitionDialogOpen}
        onOpenChange={setIsTransitionDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTransition ? "Edit transition" : "Add transition"}
            </DialogTitle>
            <DialogDescription>
              After a student finishes all levels in the source stream, they
              continue in the target stream at the given level order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>From stream</Label>
              <Select
                value={transitionForm.fromStreamId}
                onValueChange={(v) =>
                  setTransitionForm({ ...transitionForm, fromStreamId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {streams.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To stream</Label>
              <Select
                value={transitionForm.toStreamId}
                onValueChange={(v) =>
                  setTransitionForm({ ...transitionForm, toStreamId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Target" />
                </SelectTrigger>
                <SelectContent>
                  {streams.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target display order (in target stream)</Label>
              <Input
                type="number"
                min={1}
                value={transitionForm.toLevelDisplayOrder}
                onChange={(e) =>
                  setTransitionForm({
                    ...transitionForm,
                    toLevelDisplayOrder: e.target.value,
                  })
                }
                onFocus={selectInputValueOnFocus}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransitionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveTransition}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingTransition}
        onOpenChange={(o) => !o && setDeletingTransition(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove transition?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the mapping; levels are unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransition}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
