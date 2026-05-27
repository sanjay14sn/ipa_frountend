"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, GitBranch } from "lucide-react";
import { toast } from "sonner";
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
import { invalidateStreamsByProgram } from "@/hooks/api/stream.hooks";
import { invalidateStreamTransitionsByProgram } from "@/hooks/api/stream-transition.hooks";
import {
  AddStreamDialog,
  EditStreamDialog,
  DeleteStreamDialog,
  type AddStreamFormData,
} from "@/app/admin/profile/components/StreamFormDialog";
import {
  StreamTransitionDialog,
  DeleteTransitionDialog,
  type TransitionFormData,
} from "@/app/admin/profile/components/StreamTransitionDialog";
import { StreamList, TransitionList } from "@/app/admin/profile/components/StreamList";

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

const DEFAULT_FORM_DATA: AddStreamFormData = {
  name: "",
  isActive: true,
  hasStartingKit: true,
  minAge: "",
  maxAge: "",
  displayOrder: "",
};

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

  // ── Stream dialog state ──────────────────────────────────────────────────
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [deletingStream, setDeletingStream] = useState<Stream | null>(null);
  const [formData, setFormData] = useState<AddStreamFormData>(DEFAULT_FORM_DATA);
  const [editFormData, setEditFormData] = useState<UpdateStreamDto>({});

  // ── Transition dialog state ──────────────────────────────────────────────
  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [editingTransition, setEditingTransition] =
    useState<StreamTransition | null>(null);
  const [transitionForm, setTransitionForm] = useState<TransitionFormData>({
    fromStreamId: "",
    toStreamId: "",
    toLevelDisplayOrder: "1",
  });
  const [deletingTransition, setDeletingTransition] =
    useState<StreamTransition | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────

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
      toast.error("Failed to load streams or transitions");
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

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

  // ── Helpers ──────────────────────────────────────────────────────────────

  const notifyParent = () => onCatalogChange?.();

  const resetForm = () => setFormData(DEFAULT_FORM_DATA);

  const parseOptInt = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // ── Stream CRUD handlers ─────────────────────────────────────────────────

  const handleAddStream = async () => {
    if (!formData.name.trim()) {
      toast.error("Stream name is required");
      return;
    }
    const payload: CreateStreamDto = {
      name: formData.name.trim(),
      programId,
      isActive: formData.isActive,
      hasStartingKit: formData.hasStartingKit,
      minAge: parseOptInt(formData.minAge),
      maxAge: parseOptInt(formData.maxAge),
      displayOrder: Number(formData.displayOrder) || 0,
    };
    try {
      await createStream(payload);
      await invalidateStreamsByProgram(programId);
      toast.success("Stream created");
      resetForm();
      setIsAddDialogOpen(false);
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to create stream");
    }
  };

  const handleEditStream = async () => {
    if (!editingStream) return;
    try {
      await updateStream(editingStream.id, editFormData);
      await invalidateStreamsByProgram(programId);
      toast.success("Stream updated");
      setIsEditDialogOpen(false);
      setEditingStream(null);
      setEditFormData({});
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to update stream");
    }
  };

  const handleDeleteStream = async () => {
    if (!deletingStream) return;
    try {
      await deleteStream(deletingStream.id);
      await invalidateStreamsByProgram(programId);
      toast.success("Stream deleted");
      setIsDeleteDialogOpen(false);
      setDeletingStream(null);
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to delete stream. Remove levels first, or check permissions.");
    }
  };

  // ── Transition CRUD handlers ─────────────────────────────────────────────

  const openAddTransition = () => {
    setEditingTransition(null);
    setTransitionForm({
      fromStreamId: streams[0]?.id?.toString() ?? "",
      toStreamId:
        streams[1]?.id?.toString() ?? streams[0]?.id?.toString() ?? "",
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
      toast.error("Select streams and a valid target level order");
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
        toast.success("Transition updated");
      } else {
        await createStreamTransition({
          programId,
          fromStreamId: fromId,
          toStreamId: toId,
          toLevelDisplayOrder: ord,
        });
        await invalidateStreamTransitionsByProgram(programId);
        toast.success("Transition added");
      }
      setIsTransitionDialogOpen(false);
      setEditingTransition(null);
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to save transition (check target level exists)");
    }
  };

  const handleDeleteTransition = async () => {
    if (!deletingTransition) return;
    try {
      await deleteStreamTransition(deletingTransition.id);
      await invalidateStreamTransitionsByProgram(programId);
      toast.success("Transition removed");
      setDeletingTransition(null);
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to delete transition");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-card-foreground">
            Streams &amp; transitions
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage stream ages and completion transitions for {programName}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
            disabled={isLoading}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add stream
          </Button>
          <Button
            size="sm"
            onClick={openAddTransition}
            disabled={isLoading || streams.length < 1}
          >
            <GitBranch className="mr-1 h-4 w-4" />
            New transition
          </Button>
        </div>
      </header>

      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <StreamList
            streams={streams}
            isLoading={isLoading}
            programId={programId}
            onEditStream={(stream, data) => {
              setEditingStream(stream);
              setEditFormData(data);
              setIsEditDialogOpen(true);
            }}
            onDeleteStream={(stream) => {
              setDeletingStream(stream);
              setIsDeleteDialogOpen(true);
            }}
          />
        </section>

        <TransitionList
          transitions={transitions}
          streams={streams}
          isLoading={isLoading}
          onEditTransition={openEditTransition}
          onDeleteTransition={setDeletingTransition}
          onAddTransition={openAddTransition}
        />
      </div>

      {/* Stream dialogs */}
      <AddStreamDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        programName={programName}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleAddStream}
      />
      <EditStreamDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editFormData={editFormData}
        onEditFormDataChange={setEditFormData}
        onSubmit={handleEditStream}
      />
      <DeleteStreamDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        deletingStream={deletingStream}
        onConfirm={handleDeleteStream}
      />

      {/* Transition dialogs */}
      <StreamTransitionDialog
        open={isTransitionDialogOpen}
        onOpenChange={setIsTransitionDialogOpen}
        editingTransition={editingTransition}
        transitionForm={transitionForm}
        onTransitionFormChange={setTransitionForm}
        streams={streams}
        onSubmit={saveTransition}
      />
      <DeleteTransitionDialog
        deletingTransition={deletingTransition}
        onOpenChange={(o) => !o && setDeletingTransition(null)}
        onConfirm={handleDeleteTransition}
      />
    </div>
  );
}
