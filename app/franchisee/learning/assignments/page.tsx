"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PlusCircle, Trash2, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  PageSkeleton,
  RowActionButton,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
} from "@/components/shared";
import { useStudents } from "@/hooks/api/student.hooks";
import {
  cancelFranchiseAssignment,
  createFranchiseAssignment,
  deleteFranchiseAssignment,
  createFranchiseBatch,
  fetchFranchiseAssignments,
  fetchFranchiseBatches,
  fetchFranchiseBooks,
  markAssignmentStudentComplete,
  type LearningAssignment,
  type LearningBook,
} from "@/services/learning.service";
import { formatDate } from "@/lib/date-utils";

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function CreateAssignmentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [targetType, setTargetType] = useState<"INDIVIDUAL" | "BATCH">("INDIVIDUAL");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [batchId, setBatchId] = useState<string>("");
  const [batchMode, setBatchMode] = useState<"select" | "create">("select");
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchStudentIds, setNewBatchStudentIds] = useState<number[]>([]);
  const [newBatchSearch, setNewBatchSearch] = useState("");
  const [bookId, setBookId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [pageFrom, setPageFrom] = useState("1");
  const [pageTo, setPageTo] = useState("1");
  const [assignedDate, setAssignedDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(todayIso());
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "IMPORTANT">("NORMAL");

  const resetForm = () => {
    setStep(1);
    setTargetType("INDIVIDUAL");
    setStudentSearch("");
    setSelectedStudentIds([]);
    setBatchId("");
    setBatchMode("select");
    setNewBatchName("");
    setNewBatchStudentIds([]);
    setNewBatchSearch("");
    setBookId("");
    setChapterId("");
    setPageFrom("1");
    setPageTo("1");
    setAssignedDate(todayIso());
    setDueDate(todayIso());
    setInstructions("");
    setPriority("NORMAL");
  };

  const { students } = useStudents();
  const { data: batches = [] } = useQuery({
    queryKey: ["franchise-learning-batches"],
    queryFn: () => fetchFranchiseBatches(true),
    enabled: open,
  });
  const { data: books = [] } = useQuery({
    queryKey: ["franchise-learning-books"],
    queryFn: () => fetchFranchiseBooks(),
    enabled: open,
  });

  const selectedBook = books.find((b) => String(b.id) === bookId);

  useEffect(() => {
    if (step === 2 && targetType === "BATCH" && batches.length === 0) {
      setBatchMode("create");
    }
  }, [step, targetType, batches.length]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q),
    );
  }, [students, studentSearch]);

  const filteredNewBatchStudents = useMemo(() => {
    const q = newBatchSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q),
    );
  }, [students, newBatchSearch]);

  const createBatchMutation = useMutation({
    mutationFn: () =>
      createFranchiseBatch({
        name: newBatchName.trim(),
        studentIds: newBatchStudentIds,
      }),
    onSuccess: async (batch) => {
      await queryClient.invalidateQueries({ queryKey: ["franchise-learning-batches"] });
      setBatchId(String(batch.id));
      setSelectedStudentIds(batch.studentIds ?? newBatchStudentIds);
      setBatchMode("select");
      setNewBatchName("");
      setNewBatchStudentIds([]);
      setNewBatchSearch("");
      toast.success(`Batch "${batch.name}" created`);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create batch"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createFranchiseAssignment({
        bookId: Number(bookId),
        chapterId: chapterId ? Number(chapterId) : undefined,
        pageFrom: Number(pageFrom),
        pageTo: Number(pageTo),
        targetType,
        batchId: targetType === "BATCH" ? Number(batchId) : undefined,
        studentIds: selectedStudentIds,
        assignedDate,
        dueDate,
        instructions: instructions.trim() || undefined,
        priority,
      }),
    onSuccess: () => {
      toast.success("Assignment created");
      onCreated();
      onOpenChange(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create assignment"),
  });

  const applyBatchStudents = (id: string) => {
    setBatchId(id);
    const batch = batches.find((b) => String(b.id) === id);
    setSelectedStudentIds(batch?.studentIds ?? []);
  };

  const applyChapter = (id: string) => {
    setChapterId(id);
    const chapter = selectedBook?.chapters.find((c) => String(c.id) === id);
    if (chapter) {
      setPageFrom(String(chapter.pageFrom));
      setPageTo(String(chapter.pageTo));
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const canProceedFromStep = () => {
    if (step === 1) return true;
    if (step === 2) {
      if (targetType === "INDIVIDUAL") return selectedStudentIds.length > 0;
      if (batchMode === "create") return false;
      return Boolean(batchId) && selectedStudentIds.length > 0;
    }
    if (step === 3) return Boolean(bookId);
    if (step === 4) return Number(pageFrom) > 0 && Number(pageTo) >= Number(pageFrom);
    return true;
  };

  const handleNext = () => {
    if (!canProceedFromStep()) {
      if (step === 2 && targetType === "INDIVIDUAL") {
        toast.error("Select at least one student");
      } else if (step === 2 && targetType === "BATCH" && batchMode === "create") {
        toast.error("Create the batch first, or switch to an existing batch");
      } else if (step === 2 && targetType === "BATCH") {
        toast.error("Select a batch with at least one student");
      } else if (step === 3) {
        toast.error("Select a book");
      } else if (step === 4) {
        toast.error("Enter valid page range");
      }
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Assignment — Step {step} of 5</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-4">
            <button type="button" className={`rounded-xl border p-4 text-left ${targetType === "INDIVIDUAL" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => setTargetType("INDIVIDUAL")}>
              <div className="font-semibold">Individual Student</div>
              <div className="text-sm text-muted-foreground">Assign pages to one student</div>
            </button>
            <button type="button" className={`rounded-xl border p-4 text-left ${targetType === "BATCH" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => setTargetType("BATCH")}>
              <div className="font-semibold">Batch</div>
              <div className="text-sm text-muted-foreground">Assign the same work to multiple students</div>
            </button>
          </div>
        )}

        {step === 2 && targetType === "INDIVIDUAL" && (
          <div className="space-y-3">
            <Input placeholder="Search student name / roll number" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredStudents.map((student) => (
                <label key={student.id} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                  <Checkbox
                    checked={selectedStudentIds.includes(student.id)}
                    onCheckedChange={(checked) => {
                      setSelectedStudentIds((prev) =>
                        checked ? [...prev, student.id] : prev.filter((id) => id !== student.id),
                      );
                    }}
                  />
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-muted-foreground">{student.rollNo}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && targetType === "BATCH" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={batchMode === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setBatchMode("select")}
                disabled={batches.length === 0}
              >
                Use existing batch
              </Button>
              <Button
                type="button"
                variant={batchMode === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setBatchMode("create");
                  setBatchId("");
                  setSelectedStudentIds([]);
                }}
              >
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Create new batch
              </Button>
            </div>

            {batchMode === "select" ? (
              <>
                {batches.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center space-y-3">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">No batches yet</p>
                      <p className="text-sm text-muted-foreground">
                        Create a batch to group students for this assignment.
                      </p>
                    </div>
                    <Button type="button" onClick={() => setBatchMode("create")}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create your first batch
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Select Batch</Label>
                      <Select value={batchId} onValueChange={applyBatchStudents}>
                        <SelectTrigger><SelectValue placeholder="Choose batch" /></SelectTrigger>
                        <SelectContent>
                          {batches.map((batch) => (
                            <SelectItem key={batch.id} value={String(batch.id)}>
                              {batch.name} ({batch.studentCount} students)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Students included ({selectedStudentIds.length})</Label>
                      {selectedStudentIds.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
                          Pick a batch above to see its students. You can remove individual students if needed.
                        </p>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-2">
                          {students
                            .filter((s) => selectedStudentIds.includes(s.id))
                            .map((student) => (
                              <label key={student.id} className="flex items-center gap-3 rounded-lg border p-2">
                                <Checkbox
                                  checked
                                  onCheckedChange={() =>
                                    setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id))
                                  }
                                />
                                <span>{student.name} — {student.rollNo}</span>
                              </label>
                            ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="space-y-4 rounded-xl border p-4 bg-muted/20">
                <div>
                  <p className="font-medium">Create a new batch</p>
                  <p className="text-sm text-muted-foreground">
                    Name your batch and pick students. It will be saved and selected for this assignment.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newBatchName">Batch name *</Label>
                  <Input
                    id="newBatchName"
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    placeholder="e.g. Level 1 – Morning batch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Students * ({newBatchStudentIds.length} selected)</Label>
                  <Input
                    placeholder="Search student name / roll number"
                    value={newBatchSearch}
                    onChange={(e) => setNewBatchSearch(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredNewBatchStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 rounded-lg border bg-background p-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={newBatchStudentIds.includes(student.id)}
                          onCheckedChange={(checked) =>
                            setNewBatchStudentIds((prev) =>
                              checked
                                ? [...prev, student.id]
                                : prev.filter((id) => id !== student.id),
                            )
                          }
                        />
                        <span>{student.name} — {student.rollNo}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => createBatchMutation.mutate()}
                    disabled={
                      createBatchMutation.isPending ||
                      !newBatchName.trim() ||
                      newBatchStudentIds.length === 0
                    }
                  >
                    {createBatchMutation.isPending ? "Creating..." : "Create batch & use it"}
                  </Button>
                  {batches.length > 0 && (
                    <Button type="button" variant="outline" onClick={() => setBatchMode("select")}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Label>Select Book</Label>
            <Select value={bookId} onValueChange={(v) => { setBookId(v); setChapterId(""); }}>
              <SelectTrigger><SelectValue placeholder="Choose book" /></SelectTrigger>
              <SelectContent>
                {books.map((book) => (
                  <SelectItem key={book.id} value={String(book.id)}>{book.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBook && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                Level: {selectedBook.levelName} • Subject: {selectedBook.subject} • Total Pages: {selectedBook.totalPages}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            {selectedBook?.chapters?.length ? (
              <div className="space-y-2">
                <Label>Or select chapter</Label>
                <Select value={chapterId} onValueChange={applyChapter}>
                  <SelectTrigger><SelectValue placeholder="Optional chapter" /></SelectTrigger>
                  <SelectContent>
                    {selectedBook.chapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={String(chapter.id)}>
                        {chapter.title} (Pages {chapter.pageFrom}–{chapter.pageTo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Page From</Label>
                <Input type="number" min={1} value={pageFrom} onChange={(e) => setPageFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Page To</Label>
                <Input type="number" min={1} value={pageTo} onChange={(e) => setPageTo(e.target.value)} />
              </div>
            </div>
            <div className="text-sm font-medium">Selected: Pages {pageFrom}–{pageTo}</div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned Date</Label>
                <Input type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "NORMAL" | "IMPORTANT")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="IMPORTANT">Important</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Instructions</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />
            </div>
            <div className="rounded-lg border p-4 text-sm space-y-1">
              <div><strong>Book:</strong> {selectedBook?.title}</div>
              <div><strong>Pages:</strong> {pageFrom}–{pageTo}</div>
              <div><strong>Students:</strong> {selectedStudentIds.length}</div>
              <div><strong>Assigned:</strong> {assignedDate}</div>
              <div><strong>Due:</strong> {dueDate}</div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>}
          {step < 5 ? (
            <Button onClick={handleNext} disabled={step === 2 && targetType === "BATCH" && batchMode === "create"}>
              Next
            </Button>
          ) : (
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              Assign Work
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentsSection() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["franchise-learning-assignments", statusFilter],
    queryFn: () =>
      fetchFranchiseAssignments(
        statusFilter === "ALL" ? undefined : { status: statusFilter },
      ),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["franchise-learning-assignments"] });

  const cancelMutation = useMutation({
    mutationFn: cancelFranchiseAssignment,
    onSuccess: () => { toast.success("Assignment cancelled"); invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFranchiseAssignment,
    onSuccess: () => { toast.success("Assignment deleted"); invalidate(); },
    onError: (err: Error) => toast.error(err.message || "Cannot delete assignment"),
  });
  const completeMutation = useMutation({
    mutationFn: ({ assignmentId, studentId }: { assignmentId: number; studentId: number }) =>
      markAssignmentStudentComplete(assignmentId, studentId),
    onSuccess: () => { toast.success("Marked complete"); invalidate(); },
  });

  const columns: DataTableColumn<LearningAssignment>[] = useMemo(
    () => [
      { key: "book", header: "Book", render: (row) => row.bookTitle },
      { key: "pages", header: "Pages", render: (row) => `${row.pageFrom}–${row.pageTo}` },
      { key: "assigned", header: "Assigned", render: (row) => formatDate(row.assignedDate) },
      { key: "due", header: "Due", render: (row) => formatDate(row.dueDate) },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge variant={row.status === "COMPLETED" ? "default" : row.status === "CANCELLED" ? "secondary" : "outline"}>
            {row.status === "ACTIVE" ? row.completionSummary : row.status}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <div className="flex justify-end gap-1">
            {row.status === "ACTIVE" && row.students[0] && (
              <RowActionButton
                icon={CheckCircle2}
                label="Mark first complete"
                onClick={() =>
                  completeMutation.mutate({
                    assignmentId: row.id,
                    studentId: row.students[0].studentId,
                  })
                }
              />
            )}
            {row.status === "ACTIVE" && (
              <RowActionButton icon={XCircle} label="Cancel" onClick={() => cancelMutation.mutate(row.id)} />
            )}
            <RowActionButton
              icon={Trash2}
              label="Delete"
              tone="destructive"
              onClick={() => {
                if (confirm("Delete this assignment?")) deleteMutation.mutate(row.id);
              }}
            />
          </div>
        ),
      },
    ],
    [cancelMutation, completeMutation, deleteMutation],
  );

  return (
    <TablePageShell
      title="Assignments"
      description="Assign book pages to students or batches."
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Assignment
        </Button>
      }
    >
      <div className="mb-4 max-w-xs">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={assignments}
          loading={isLoading}
          columns={columns}
          getRowId={(row) => String(row.id)}
          renderMainCell={(row) => (
            <TableMainCell
              title={row.targetType === "BATCH" ? `Batch #${row.batchId}` : row.students[0]?.studentName ?? "Students"}
              subtitle={`${row.students.length} student(s)`}
            />
          )}
          emptyMessage="No assignments yet."
        />
      )}
      <CreateAssignmentDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={invalidate} />
    </TablePageShell>
  );
}

export default function FranchiseAssignmentsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AssignmentsSection />
    </Suspense>
  );
}
