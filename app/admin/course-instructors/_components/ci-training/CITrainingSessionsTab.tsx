"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CITrainingSession,
  CITrainingAssignment,
  listSessions,
  listAssignmentsBySession,
  createSession,
  completeAssignment,
  completeSession,
  reassignAssignment,
  rescheduleSession,
} from "@/services/ci-training-admin.service";
import { getAllPrograms, Program } from "@/services/program.service";
import {
  getTrainingLevelsByProgram,
  TrainingLevel,
} from "@/services/training-level.service";
import { DataTable, type DataTableColumn, TableMainCell } from "@/components/shared";
import { Plus, CheckCircle2, CalendarDays } from "lucide-react";
import {
  formatStateLabel,
  getApiErrorMessage,
  stateNames,
  StatusBadge,
} from "./ci-training-utils";

const EMPTY_ASSIGNMENTS: CITrainingAssignment[] = [];

/** Human-facing session label — never the raw session id. */
function sessionLevelLabel(
  s: Pick<CITrainingSession, "trainingLevelName" | "trainingLevelCode"> | null | undefined,
) {
  return s?.trainingLevelName ?? s?.trainingLevelCode ?? "Training level";
}

/**
 * Marks come off a number input, so they arrive as strings and may be blank.
 *
 * Theory was previously guarded only by the browser (`required`, `min=0`) and
 * then passed through Number() — which yields NaN for a blank or non-numeric
 * value, and NaN is what would have been sent if native validation was ever
 * bypassed. Practical stays optional: blank means "not recorded".
 */
const marksNumber = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== "" && Number.isFinite(Number(v)), {
      message: `${label} must be a number`,
    })
    .refine((v) => Number(v) >= 0, {
      message: `${label} cannot be negative`,
    });

export const marksSchema = z.object({
  theoryMarks: marksNumber("Theory marks"),
  practicalMarks: z
    .string()
    .trim()
    .refine((v) => v === "" || Number.isFinite(Number(v)), {
      message: "Practical marks must be a number",
    })
    .refine((v) => v === "" || Number(v) >= 0, {
      message: "Practical marks cannot be negative",
    }),
});
type MarksFormValues = z.infer<typeof marksSchema>;

const createSessionSchema = z.object({
  programId: z.string().min(1, "Select a program."),
  trainingLevelId: z.string().min(1, "Select a training level."),
  region: z.string(),
  sessionDate: z.string(),
  notes: z.string(),
});
type CreateSessionFormValues = z.infer<typeof createSessionSchema>;


// ---------------------------------------------------------------------------
// CreateSessionModal
// ---------------------------------------------------------------------------

function CreateSessionModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const form = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      programId: "",
      trainingLevelId: "",
      region: "",
      sessionDate: "",
      notes: "",
    },
  });
  const programId = useWatch({ control: form.control, name: "programId" });
  const trainingLevelId = useWatch({
    control: form.control,
    name: "trainingLevelId",
  });
  const region = useWatch({ control: form.control, name: "region" });
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);

  const loadPrograms = async () => {
    if (loadingPrograms) return;
    setLoadingPrograms(true);
    try {
      await queryClient.fetchQuery({
        queryKey: ["ci-training-programs"],
        queryFn: () => getAllPrograms(),
        staleTime: Infinity,
        gcTime: Infinity,
      });
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to load programs."));
    } finally {
      setLoadingPrograms(false);
    }
  };

  const loadLevelsForProgram = async (selectedProgramId: number) => {
    if (!selectedProgramId || loadingLevels) return;
    setLoadingLevels(true);
    try {
      const rows = await queryClient.fetchQuery({
        queryKey: ["ci-training-level-options", selectedProgramId],
        queryFn: () => getTrainingLevelsByProgram(selectedProgramId),
        staleTime: Infinity,
        gcTime: Infinity,
      });
      setTrainingLevels(rows.filter((level) => level.isActive));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to load training levels."));
    } finally {
      setLoadingLevels(false);
    }
  };

  const programs =
    queryClient.getQueryData<Program[]>(["ci-training-programs"]) ?? [];

  const handleSubmit = form.handleSubmit(
    async (values) => {
      setLoading(true);
      try {
        await createSession({
          region: values.region.trim().toLowerCase(),
          trainingLevelId: Number(values.trainingLevelId),
          sessionDate: values.sessionDate,
          notes: values.notes || undefined,
        });
        toast.success("Session created");
        onSuccess();
        onClose();
        form.reset();
        setTrainingLevels([]);
      } catch {
        toast.error("Failed to create session.");
      } finally {
        setLoading(false);
      }
    },
    // The two required selects had no inline error slot, so their messages
    // stay toasts — same text, same order as before.
    (fieldErrors) => {
      const message =
        fieldErrors.programId?.message ?? fieldErrors.trainingLevelId?.message;
      if (message) toast.error(message);
    },
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
      size="sm"
      title="Create Training Session"
      description="Schedule a new CI training session"
      formId="create-training-session-form"
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={loading ? "Creating..." : "Create"}
      cancelLabel="Cancel"
    >
      <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="programId">Program</Label>
              <Select
                value={programId}
                onValueChange={(value) => {
                  form.setValue("programId", value, { shouldValidate: true });
                  form.setValue("trainingLevelId", "");
                  setTrainingLevels([]);
                }}
                onOpenChange={(open) => {
                  if (open) void loadPrograms();
                }}
              >
                <SelectTrigger id="programId">
                  <SelectValue
                    placeholder={
                      loadingPrograms ? "Loading programs..." : "Select program"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select
                value={region}
                onValueChange={(v) => form.setValue("region", v)}
              >
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {stateNames.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="levelId">Training Level</Label>
              <Select
                value={trainingLevelId}
                onValueChange={(v) =>
                  form.setValue("trainingLevelId", v, { shouldValidate: true })
                }
                onOpenChange={(open) => {
                  if (open && programId) {
                    void loadLevelsForProgram(Number(programId));
                  }
                }}
              >
                <SelectTrigger id="levelId">
                  <SelectValue
                    placeholder={
                      !programId
                        ? "Select program first"
                        : loadingLevels
                          ? "Loading levels..."
                          : "Select training level"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {trainingLevels.map((level) => (
                    <SelectItem key={level.id} value={String(level.id)}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionDate">Session Date</Label>
            <Controller
              control={form.control}
              name="sessionDate"
              render={({ field }) => (
                <DateInput
                  id="sessionDate"
                  value={field.value}
                  onChange={field.onChange}
                  required
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              {...form.register("notes")}
              placeholder="Session notes"
            />
          </div>
      </div>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// RecordMarksModal
// ---------------------------------------------------------------------------

function RecordMarksModal({
  assignment,
  onClose,
  onSuccess,
}: {
  assignment: CITrainingAssignment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const form = useForm<MarksFormValues>({
    resolver: zodResolver(marksSchema),
    defaultValues: { theoryMarks: "", practicalMarks: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!assignment) return;
    setLoading(true);
    try {
      await completeAssignment(assignment.id, {
        theoryMarks: Number(values.theoryMarks),
        practicalMarks:
          values.practicalMarks.trim() === ""
            ? undefined
            : Number(values.practicalMarks),
      });
      toast.success("Marks recorded");
      onSuccess();
      onClose();
      form.reset();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to record marks."));
    } finally {
      setLoading(false);
    }
  });

  return (
    <FormDialog
      open={!!assignment}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
      size="sm"
      title="Record Marks"
      description={assignment?.instructorName ?? assignment?.instructorCode ?? "Course instructor"}
      formId="record-marks-form"
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={loading ? "Saving..." : "Save Marks"}
      cancelLabel="Cancel"
    >
      <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="theoryMarks">Theory Marks</Label>
            <Input
              id="theoryMarks"
              type="number"
              min="0"
              {...form.register("theoryMarks")}
            />
            {form.formState.errors.theoryMarks && (
              <p className="text-sm text-destructive">
                {form.formState.errors.theoryMarks.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="practicalMarks">Practical Marks</Label>
            <Input
              id="practicalMarks"
              type="number"
              min="0"
              {...form.register("practicalMarks")}
            />
            {form.formState.errors.practicalMarks && (
              <p className="text-sm text-destructive">
                {form.formState.errors.practicalMarks.message}
              </p>
            )}
          </div>
      </div>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// ReassignModal
// ---------------------------------------------------------------------------

function ReassignModal({
  assignment,
  onClose,
  onSuccess,
}: {
  assignment: CITrainingAssignment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState("");

  const { data: sessionOptions = [] } = useQuery({
    queryKey: ["ci-training", "sessions", "reassign-options"],
    queryFn: () => listSessions(),
    enabled: !!assignment,
    staleTime: 30_000,
  });
  const openSessions = sessionOptions.filter(
    (s) => s.status === "OPEN" && s.id !== assignment?.sessionId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    setLoading(true);
    try {
      await reassignAssignment(assignment.id, Number(targetSessionId));
      toast.success("Reassigned");
      onSuccess();
      onClose();
      setTargetSessionId("");
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, "Failed to reassign."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={!!assignment}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
      size="sm"
      title="Reassign to Session"
      description={assignment?.instructorName}
      formId="reassign-session-form"
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={loading ? "Reassigning..." : "Reassign"}
      cancelLabel="Cancel"
    >
      <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="targetSession">Target session</Label>
            <Select value={targetSessionId} onValueChange={setTargetSessionId}>
              <SelectTrigger id="targetSession">
                <SelectValue placeholder="Select a session" />
              </SelectTrigger>
              <SelectContent>
                {openSessions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {formatStateLabel(s.region)} · {sessionLevelLabel(s)} ·{" "}
                    {s.sessionDate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {openSessions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No other open sessions available.
              </p>
            )}
          </div>
      </div>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// CompleteSessionModal types + component
// ---------------------------------------------------------------------------

type CompleteSessionMarksRow = {
  assignment: CITrainingAssignment;
  theoryMarks: string;
  practicalMarks: string;
  notes: string;
  error?: string;
  completed?: boolean;
};

type CompleteSessionMarksDraft = Omit<CompleteSessionMarksRow, "assignment">;

function CompleteSessionModal({
  session,
  onClose,
  onSuccess,
}: {
  session: CITrainingSession | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<number, CompleteSessionMarksDraft>
  >({});
  const sessionId = session?.id ?? null;

  const { data: assignments = EMPTY_ASSIGNMENTS, isLoading } = useQuery({
    queryKey: ["ci-training-assignments", sessionId],
    queryFn: () => listAssignmentsBySession(Number(sessionId)),
    enabled: Boolean(sessionId),
  });

  const assigned = useMemo(
    () => assignments.filter((assignment) => assignment.status === "ASSIGNED"),
    [assignments],
  );

  const rows = useMemo<CompleteSessionMarksRow[]>(
    () =>
      assigned.map((assignment) => {
        const draft = drafts[assignment.id];
        return {
          assignment,
          theoryMarks:
            draft?.theoryMarks ??
            (assignment.theoryMarks != null
              ? String(assignment.theoryMarks)
              : ""),
          practicalMarks:
            draft?.practicalMarks ??
            (assignment.practicalMarks != null
              ? String(assignment.practicalMarks)
              : ""),
          notes: draft?.notes ?? "",
          error: draft?.error,
          completed: draft?.completed,
        };
      }),
    [assigned, drafts],
  );

  const updateRow = (
    assignmentId: number,
    patch: Partial<Omit<CompleteSessionMarksRow, "assignment">>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [assignmentId]: {
        theoryMarks:
          patch.theoryMarks ?? current[assignmentId]?.theoryMarks ?? "",
        practicalMarks:
          patch.practicalMarks ?? current[assignmentId]?.practicalMarks ?? "",
        notes: patch.notes ?? current[assignmentId]?.notes ?? "",
        error: patch.error ?? current[assignmentId]?.error,
        completed: patch.completed ?? current[assignmentId]?.completed,
      },
    }));
  };

  const closeModal = () => {
    setDrafts({});
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const missing = rows.find((row) => row.theoryMarks.trim() === "");
    if (missing) {
      toast.error("Enter theory marks for every assigned CI.");
      return;
    }

    setLoading(true);
    let failed = 0;

    for (const row of rows) {
      try {
        await completeAssignment(row.assignment.id, {
          theoryMarks: Number(row.theoryMarks),
          practicalMarks:
            row.practicalMarks.trim() === ""
              ? undefined
              : Number(row.practicalMarks),
          notes: row.notes.trim() || undefined,
        });
        updateRow(row.assignment.id, {
          completed: true,
          error: undefined,
        });
      } catch (err: unknown) {
        failed += 1;
        updateRow(row.assignment.id, {
          error: getApiErrorMessage(err, "Failed to complete this CI."),
        });
      }
    }

    if (failed > 0) {
      setLoading(false);
      toast.error(
        "Some CIs were not completed. Review the inline errors and submit again.",
      );
      onSuccess();
      return;
    }

    // All marks recorded — now actually close the session so it stops
    // surfacing to franchisees and further assignment is blocked.
    try {
      await completeSession(session.id);
    } catch (err: unknown) {
      setLoading(false);
      toast.error(getApiErrorMessage(err, "Failed to mark the session completed"));
      onSuccess();
      return;
    }

    setLoading(false);
    toast.success("Session completed");
    onSuccess();
    closeModal();
  };

  return (
    <FormDialog
      open={!!session}
      onOpenChange={(open) => {
        if (!open && !loading) closeModal();
      }}
      size="xl"
      scrollBody
      maxHeight="max-h-[85vh]"
      title="Complete Session"
      description={
        session
          ? `${formatStateLabel(session.region)} - ${sessionLevelLabel(session)} - ${session.sessionDate}`
          : "Record marks for assigned CIs"
      }
      formId="complete-session-form"
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={loading ? "Completing..." : "Mark Session Completed"}
      cancelLabel="Cancel"
      canSubmit={!loading && rows.length > 0}
    >
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading assigned CIs...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No assigned CIs found for this session.
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="overflow-hidden rounded-xl border">
              <div className="grid grid-cols-[1.3fr_1fr_120px_120px_1fr] gap-3 bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <div>Course instructor</div>
                <div>Franchise</div>
                <div>Theory</div>
                <div>Practical</div>
                <div>Notes</div>
              </div>
              <div className="divide-y">
                {rows.map((row) => (
                  <div key={row.assignment.id} className="px-4 py-3">
                    <div className="grid grid-cols-[1.3fr_1fr_120px_120px_1fr] items-start gap-3">
                      <div>
                        <div className="font-medium text-card-foreground">
                          {row.assignment.instructorName ??
                            row.assignment.instructorCode ??
                            "Course instructor"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.assignment.instructorCode ?? "Code unavailable"}
                        </div>
                      </div>
                      <div className="text-sm text-card-foreground">
                        {row.assignment.franchiseName ?? "-"}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={row.theoryMarks}
                        onChange={(event) =>
                          updateRow(row.assignment.id, {
                            theoryMarks: event.target.value,
                            error: undefined,
                          })
                        }
                        disabled={loading || row.completed}
                        required
                      />
                      <Input
                        type="number"
                        min="0"
                        value={row.practicalMarks}
                        onChange={(event) =>
                          updateRow(row.assignment.id, {
                            practicalMarks: event.target.value,
                            error: undefined,
                          })
                        }
                        disabled={loading || row.completed}
                      />
                      <Input
                        value={row.notes}
                        onChange={(event) =>
                          updateRow(row.assignment.id, {
                            notes: event.target.value,
                            error: undefined,
                          })
                        }
                        disabled={loading || row.completed}
                        placeholder="Optional"
                      />
                    </div>
                    {row.error && (
                      <p className="mt-2 text-xs text-destructive">
                        {row.error}
                      </p>
                    )}
                    {row.completed && !row.error && (
                      <p className="mt-2 text-xs text-emerald-700">
                        Completed
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// SessionAssignmentsPanel
// ---------------------------------------------------------------------------

function SessionAssignmentsPanel({
  session,
  onOpenMarks,
  onOpenReassign,
}: {
  session: CITrainingSession;
  onOpenMarks: (assignment: CITrainingAssignment) => void;
  onOpenReassign: (assignment: CITrainingAssignment) => void;
}) {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["ci-training-assignments", session.id],
    queryFn: () => listAssignmentsBySession(session.id),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const columns = useMemo<DataTableColumn<CITrainingAssignment>[]>(
    () => [
      { key: "code", header: "Code", render: (a) => a.instructorCode ?? "—" },
      {
        key: "franchise",
        header: "Franchise",
        render: (a) => a.franchiseName ?? "—",
      },
      {
        key: "status",
        header: "Status",
        render: (a) => <StatusBadge status={a.status} />,
      },
      { key: "theory", header: "Theory", render: (a) => a.theoryMarks ?? "—" },
      {
        key: "practical",
        header: "Practical",
        render: (a) => a.practicalMarks ?? "—",
      },
      {
        key: "actions",
        header: "Actions",
        render: (a) =>
          a.status === "ASSIGNED" || a.status === "WAITING" ? (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenMarks(a)}
              >
                Marks
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenReassign(a)}
              >
                Reassign
              </Button>
            </div>
          ) : (
            "—"
          ),
      },
    ],
    [onOpenMarks, onOpenReassign],
  );

  return (
    <div className="space-y-3">
      <DataTable<CITrainingAssignment>
        data={assignments}
        loading={isLoading}
        columns={columns}
        getRowId={(a) => String(a.id)}
        renderMainCell={(a) => (
          <TableMainCell
            title={a.instructorName ?? a.instructorCode ?? "Course instructor"}
            subtitle={a.instructorCode ?? "—"}
          />
        )}
        emptyMessage="No assignments for this session"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RescheduleSessionModal
// ---------------------------------------------------------------------------

function RescheduleSessionModal({
  session,
  onClose,
  onSuccess,
}: {
  session: CITrainingSession | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newDate, setNewDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) setNewDate(session.sessionDate);
  }, [session]);

  async function handleSubmit() {
    if (!session || !newDate) return;
    setLoading(true);
    try {
      await rescheduleSession(session.id, newDate);
      toast.success("Session rescheduled successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to reschedule session"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormDialog
      open={!!session}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="md"
      title="Reschedule Session"
      description={
        <>
          {formatStateLabel(session?.region)} /{" "}
          {sessionLevelLabel(session)} &mdash; {session?.sessionDate}
        </>
      }
      formId="reschedule-session-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      isSubmitting={loading}
      submitLabel={loading ? "Rescheduling..." : "Reschedule"}
      cancelLabel="Cancel"
      canSubmit={!loading && Boolean(newDate)}
    >
      <div className="space-y-2">
        <Label htmlFor="reschedule-date">New Session Date</Label>
        <DateInput
          id="reschedule-date"
          value={newDate}
          onChange={(v) => setNewDate(v)}
        />
      </div>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// SessionsTab (exported)
// ---------------------------------------------------------------------------

export function SessionsTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [marksTarget, setMarksTarget] = useState<CITrainingAssignment | null>(
    null,
  );
  const [reassignTarget, setReassignTarget] =
    useState<CITrainingAssignment | null>(null);
  const [completeSessionTarget, setCompleteSessionTarget] =
    useState<CITrainingSession | null>(null);
  const [rescheduleTarget, setRescheduleTarget] =
    useState<CITrainingSession | null>(null);
  const [regionFilter, setRegionFilter] = useState("");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["ci-training-sessions", regionFilter, search],
    queryFn: () =>
      listSessions({
        region: regionFilter || undefined,
        search: search.trim() || undefined,
      }),
    staleTime: 30_000,
  });

  const columns = useMemo<DataTableColumn<CITrainingSession>[]>(
    () => [
      {
        key: "region",
        header: "State",
        render: (s) => formatStateLabel(s.region),
      },
      {
        key: "trainingLevel",
        header: "Training Level",
        render: (s) => sessionLevelLabel(s),
      },
      {
        key: "sessionDate",
        header: "Session Date",
        render: (s) => s.sessionDate,
      },
      { key: "venue", header: "Venue", render: (s) => s.venue ?? "—" },
      {
        key: "status",
        header: "Status",
        render: (s) => <StatusBadge status={s.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (s) => (
          <div className="flex items-center gap-2">
            {s.status === "OPEN" && (
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  setRescheduleTarget(s);
                }}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Reschedule
              </Button>
            )}
            {s.status === "OPEN" && (
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  setCompleteSessionTarget(s);
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Session
              </Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select
          value={regionFilter || "all"}
          onValueChange={(value) =>
            setRegionFilter(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Filter by state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {stateNames.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Session
        </Button>
      </div>

      <DataTable<CITrainingSession>
        data={sessions}
        loading={isLoading}
        columns={columns}
        getRowId={(s) => String(s.id)}
        renderMainCell={(s) => (
          <TableMainCell
            title={formatStateLabel(s.region)}
            subtitle={`${sessionLevelLabel(s)} - ${s.sessionDate}`}
          />
        )}
        renderExpandedContent={(session) => (
          <SessionAssignmentsPanel
            session={session}
            onOpenMarks={setMarksTarget}
            onOpenReassign={setReassignTarget}
          />
        )}
        searchPlaceholder="Search by state or date..."
        onSearchChange={setSearch}
        emptyMessage="No sessions found"
      />

      <CreateSessionModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ["ci-training-sessions"],
          });
        }}
      />
      <RescheduleSessionModal
        session={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ["ci-training-sessions"],
          });
        }}
      />
      <RecordMarksModal
        assignment={marksTarget}
        onClose={() => setMarksTarget(null)}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ["ci-training-assignments"],
          });
          void queryClient.invalidateQueries({
            queryKey: ["ci-training-sessions"],
          });
        }}
      />
      <CompleteSessionModal
        session={completeSessionTarget}
        onClose={() => setCompleteSessionTarget(null)}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ["ci-training-assignments"],
          });
          void queryClient.invalidateQueries({
            queryKey: ["ci-training-sessions"],
          });
          void queryClient.invalidateQueries({
            queryKey: ["ci-training-waiting"],
          });
        }}
      />
      <ReassignModal
        assignment={reassignTarget}
        onClose={() => setReassignTarget(null)}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ["ci-training-assignments"],
          });
          void queryClient.invalidateQueries({
            queryKey: ["ci-training-sessions"],
          });
        }}
      />
    </div>
  );
}
