"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CITrainingSession,
  CITrainingAssignment,
  WaitingInstructor,
  listSessions,
  listAssignmentsBySession,
  listWaiting,
  createSession,
  completeAssignment,
  reassignAssignment,
} from "@/services/ci-training-admin.service";
import { getAllPrograms, Program } from "@/services/program.service";
import {
  getTrainingLevelsByProgram,
  TrainingLevel,
} from "@/services/training-level.service";
import {
  DataTable,
  TablePageShell,
  type DataTableColumn,
} from "@/components/shared";
import { Plus, ClipboardList, CheckCircle2 } from "lucide-react";
import statesCities from "@/data/indian-states-cities.json";
// import { CITrainingPackagesManager } from "../catalog/ci-training-packages/page";

type StatesCitiesType = Record<string, string[]>;
const statesData = statesCities as StatesCitiesType;
const EMPTY_ASSIGNMENTS: CITrainingAssignment[] = [];
const stateNames = Object.keys(statesData).sort();

function formatStateLabel(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    WAITING: "bg-yellow-100 text-yellow-800",
    ASSIGNED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}

function getApiErrorMessage(err: unknown, fallback: string) {
  const responseMessage = (err as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(", ");
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }
  return fallback;
}

function CreateSessionModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
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
    } finally {
      setLoadingLevels(false);
    }
  };

  const programs =
    queryClient.getQueryData<Program[]>(["ci-training-programs"]) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) {
      toast({
        title: "Validation",
        description: "Select a program.",
        variant: "destructive",
      });
      return;
    }
    if (!trainingLevelId) {
      toast({
        title: "Validation",
        description: "Select a training level.",
        variant: "destructive",
      });
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
      toast({ title: "Session created" });
      onSuccess();
      onClose();
      setRegion("");
      setProgramId("");
      setTrainingLevelId("");
      setSessionDate("");
      setNotes("");
      setTrainingLevels([]);
    } catch {
      toast({
        title: "Error",
        description: "Failed to create session.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Create Training Session</DialogTitle>
          <DialogDescription>
            Schedule a new CI training session
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
            <Input
              id="sessionDate"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordMarksModal({
  assignment,
  onClose,
  onSuccess,
}: {
  assignment: CITrainingAssignment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
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
      toast({ title: "Marks recorded" });
      onSuccess();
      onClose();
      setTheoryMarks("");
      setPracticalMarks("");
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(err, "Failed to record marks."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={!!assignment}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Record Marks</DialogTitle>
          <DialogDescription>
            {assignment?.instructorName ?? `Assignment #${assignment?.id}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Marks"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReassignModal({
  assignment,
  onClose,
  onSuccess,
}: {
  assignment: CITrainingAssignment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    setLoading(true);
    try {
      await reassignAssignment(assignment.id, Number(targetSessionId));
      toast({ title: "Reassigned" });
      onSuccess();
      onClose();
      setTargetSessionId("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message ?? "Failed to reassign.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={!!assignment}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Reassign to Session</DialogTitle>
          <DialogDescription>{assignment?.instructorName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  const { toast } = useToast();
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
            (assignment.theoryMarks != null ? String(assignment.theoryMarks) : ""),
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
      toast({
        title: "Validation",
        description: "Enter theory marks for every assigned CI.",
        variant: "destructive",
      });
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
      toast({
        title: "Some CIs were not completed",
        description: "Review the inline errors and submit again.",
        variant: "destructive",
      });
      onSuccess();
      return;
    }

    toast({ title: "Session completed" });
    onSuccess();
    closeModal();
  };

  return (
    <Dialog
      open={!!session}
      onOpenChange={(open) => {
        if (!open && !loading) closeModal();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Complete Session</DialogTitle>
          <DialogDescription>
            {session
              ? `${formatStateLabel(session.region)} - ${
                  session.trainingLevelName ?? `Level ${session.trainingLevelId}`
                } - ${session.sessionDate}`
              : "Record marks for assigned CIs"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading assigned CIs...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No assigned CIs found for this session.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="overflow-hidden rounded-xl border">
              <div className="grid grid-cols-[1.3fr_1fr_120px_120px_1fr] gap-3 bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || rows.length === 0}>
                {loading ? "Completing..." : "Mark Session Completed"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">
              {a.instructorName ?? `CI-${a.instructorId}`}
            </div>
            <div className="text-sm text-gray-500">
              {a.instructorCode ?? "—"}
            </div>
          </div>
        )}
        emptyMessage="No assignments for this session"
      />
    </div>
  );
}

function SessionsTab() {
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
  const [regionFilter, setRegionFilter] = useState("");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["ci-training-sessions", regionFilter],
    queryFn: () =>
      listSessions(regionFilter ? { region: regionFilter } : undefined),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((s) => {
      return (
        String(s.id).includes(term) ||
        s.region.toLowerCase().includes(term) ||
        String(s.trainingLevelId).includes(term) ||
        (s.trainingLevelName ?? "").toLowerCase().includes(term) ||
        s.sessionDate.toLowerCase().includes(term)
      );
    });
  }, [sessions, search]);

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
        data={filteredSessions}
        loading={isLoading}
        columns={columns}
        getRowId={(s) => String(s.id)}
        renderMainCell={(s) => (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">
              {formatStateLabel(s.region)}
            </div>
            <div className="text-sm text-gray-500">
              #{s.id} - {s.trainingLevelName ?? `Level ${s.trainingLevelId}`}
            </div>
          </div>
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

function WaitingTab() {
  const queryClient = useQueryClient();
  const [regionFilter, setRegionFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [trainingLevelFilter, setTrainingLevelFilter] = useState("");
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);
  const [search, setSearch] = useState("");
  const programs =
    queryClient.getQueryData<Program[]>(["ci-training-programs"]) ?? [];

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
    } finally {
      setLoadingLevels(false);
    }
  };

  const { data: waiting = [], isLoading } = useQuery({
    queryKey: ["ci-training-waiting", regionFilter, trainingLevelFilter],
    queryFn: () =>
      listWaiting({
        region: regionFilter || undefined,
        trainingLevelId: trainingLevelFilter
          ? Number(trainingLevelFilter)
          : undefined,
      }),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const filteredWaiting = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return waiting;
    return waiting.filter((w) => {
      return (
        (w.instructorName ?? "").toLowerCase().includes(term) ||
        (w.instructorCode ?? "").toLowerCase().includes(term) ||
        (w.franchiseName ?? "").toLowerCase().includes(term) ||
        w.region.toLowerCase().includes(term) ||
        String(w.trainingLevelId).includes(term)
      );
    });
  }, [waiting, search]);

  const columns = useMemo<DataTableColumn<WaitingInstructor>[]>(
    () => [
      { key: "code", header: "Code", render: (w) => w.instructorCode ?? "—" },
      {
        key: "franchise",
        header: "Franchise",
        render: (w) => w.franchiseName ?? "—",
      },
      {
        key: "region",
        header: "State",
        render: (w) => formatStateLabel(w.region),
      },
      {
        key: "trainingLevel",
        header: "Training Level",
        render: (w) => `Level ${w.trainingLevelId}`,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
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

        <Select
          value={programFilter || "all"}
          onValueChange={(value) => {
            setProgramFilter(value === "all" ? "" : value);
            setTrainingLevelFilter("");
            setTrainingLevels([]);
          }}
          onOpenChange={(open) => {
            if (open) void loadPrograms();
          }}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue
              placeholder={
                loadingPrograms ? "Loading programs..." : "Filter by program"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={String(program.id)}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={trainingLevelFilter || "all"}
          onValueChange={(value) =>
            setTrainingLevelFilter(value === "all" ? "" : value)
          }
          onOpenChange={(open) => {
            if (open && programFilter) {
              void loadLevelsForProgram(Number(programFilter));
            }
          }}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue
              placeholder={
                !programFilter
                  ? "Filter by training level"
                  : loadingLevels
                    ? "Loading training levels..."
                    : "Filter by training level"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All training levels</SelectItem>
            {trainingLevels.map((level) => (
              <SelectItem key={level.id} value={String(level.id)}>
                {level.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable<WaitingInstructor>
        data={filteredWaiting}
        loading={isLoading}
        columns={columns}
        getRowId={(w) => `${w.instructorId}-${w.trainingLevelId}-${w.region}`}
        renderMainCell={(w) => (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">
              {w.instructorName ?? `CI-${w.instructorId}`}
            </div>
            <div className="text-sm text-gray-500">
              {w.instructorCode ?? "—"} - {formatStateLabel(w.region)}
            </div>
          </div>
        )}
        searchPlaceholder="Search instructor, code, franchise or state..."
        onSearchChange={setSearch}
        emptyMessage="No instructors waiting"
      />
    </div>
  );
}

export function CiTrainingSection() {
  return (
    <TablePageShell>
      <div className="rounded-2xl border bg-card px-4 py-4 shadow-sm sm:px-5">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl text-card-foreground">CI Training</h1>
            <p className="text-muted-foreground text-sm">
              Manage training sessions, assignments and marks
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Sessions & Assignments</TabsTrigger>
          <TabsTrigger value="waiting">Waiting List</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="waiting">
          <WaitingTab />
        </TabsContent>
        <TabsContent value="packages">
          {/*<CITrainingPackagesManager />*/}
        </TabsContent>
      </Tabs>
    </TablePageShell>
  );
}
