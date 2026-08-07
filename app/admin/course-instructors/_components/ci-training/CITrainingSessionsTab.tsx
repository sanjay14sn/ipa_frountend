"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [region, setRegion] = useState("");
  const [programId, setProgramId] = useState("");
  const [trainingLevelId, setTrainingLevelId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [notes, setNotes] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) {
      toast.error("Select a program.");
      return;
    }
    if (!trainingLevelId) {
      toast.error("Select a training level.");
      return;
    }
    setLoading(true);
    try {
      await createSession({
        programId: Number(programId),
        region: region.trim().toLowerCase(),
        trainingLevelId: Number(trainingLevelId),
        sessionDate,
        notes: notes || undefined,
      });
      toast.success("Session created");
      onSuccess();
      onClose();
      setRegion("");
      setProgramId("");
      setTrainingLevelId("");
      setSessionDate("");
      setNotes("");
      setTrainingLevels([]);
    } catch {
      toast.error("Failed to create session.");
    } finally {
      setLoading(false);
    }
  };

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
                  setProgramId(value);
                  setTrainingLevelId("");
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
              <Select value={region} onValueChange={setRegion}>
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
                onValueChange={setTrainingLevelId}
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
            <DateInput
              id="sessionDate"
              value={sessionDate}
              onChange={(v) => setSessionDate(v)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
  const [theoryMarks, setTheoryMarks] = useState("");
  const [practicalMarks, setPracticalMarks] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    setLoading(true);
    try {
      await completeAssignment(assignment.id, {
        theoryMarks: Number(theoryMarks),
        practicalMarks:
          practicalMarks.trim() === "" ? undefined : Number(practicalMarks),
      });
      toast.success("Marks recorded");
      onSuccess();
      onClose();
      setTheoryMarks("");
      setPracticalMarks("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to record marks."));
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
      title="Record Marks"
      description={assignment?.instructorName ?? `Assignment #${assignment?.id}`}
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
              value={theoryMarks}
              onChange={(e) => setTheoryMarks(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="practicalMarks">Practical Marks</Label>
            <Input
              id="practicalMarks"
              type="number"
              min="0"
              value={practicalMarks}
              onChange={(e) => setPracticalMarks(e.target.value)}
            />
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
            <Label htmlFor="targetSession">Target Session ID</Label>
            <Input
              id="targetSession"
              type="number"
              min="1"
              value={targetSessionId}
              onChange={(e) => setTargetSessionId(e.target.value)}
              required
            />
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

    setLoading(false);

    if (failed > 0) {
      toast.error(
        "Some CIs were not completed. Review the inline errors and submit again.",
      );
      onSuccess();
      return;
    }

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
          ? `${formatStateLabel(session.region)} - ${
              session.trainingLevelName ?? `Level ${session.trainingLevelId}`
            } - ${session.sessionDate}`
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
                            `CI-${row.assignment.instructorId}`}
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
            title={a.instructorName ?? `CI-${a.instructorId}`}
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
          Session #{session?.id} &mdash;{" "}
          {formatStateLabel(session?.region)} /{" "}
          {session?.trainingLevelName ?? `Level ${session?.trainingLevelId}`}
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
      { key: "id", header: "ID", render: (s) => `#${s.id}` },
      {
        key: "region",
        header: "State",
        render: (s) => formatStateLabel(s.region),
      },
      {
        key: "trainingLevel",
        header: "Training Level",
        render: (s) => s.trainingLevelName ?? `Level ${s.trainingLevelId}`,
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
            subtitle={`#${s.id} - ${s.trainingLevelName ?? `Level ${s.trainingLevelId}`}`}
          />
        )}
        renderExpandedContent={(session) => (
          <SessionAssignmentsPanel
            session={session}
            onOpenMarks={setMarksTarget}
            onOpenReassign={setReassignTarget}
          />
        )}
        searchPlaceholder="Search by session ID, state, level or date..."
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
