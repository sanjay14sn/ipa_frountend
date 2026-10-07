"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, PenLine, PlusCircle, Power, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getAllCourseInstructors } from "@/services/course-instructor.service";
import {
  createFranchiseBatch,
  deactivateFranchiseBatch,
  deleteFranchiseBatch,
  fetchFranchiseBatches,
  updateFranchiseBatch,
  type LearningBatch,
} from "@/services/learning.service";

type StudentAssignmentFilter = "all" | "available" | "assigned";

function BatchDialog({
  open,
  onOpenChange,
  initial,
  batches,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: LearningBatch | null;
  batches: LearningBatch[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [instructorId, setInstructorId] = useState(
    initial?.coordinatorInstructorId ? String(initial.coordinatorInstructorId) : "",
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>(
    initial?.studentIds ?? [],
  );
  const [studentQuery, setStudentQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<StudentAssignmentFilter>("all");
  const { students } = useStudents();
  const { data: instructors = [], isLoading: instructorsLoading } = useQuery({
    queryKey: ["franchise-course-instructors"],
    queryFn: async () => {
      const res = await getAllCourseInstructors();
      return res.result ?? [];
    },
    enabled: open,
  });
  const approvedInstructors = useMemo(() => {
    const approved = instructors.filter((instructor) => instructor.status === "Approved");
    if (!instructorId) return approved;
    if (approved.some((instructor) => String(instructor.id) === instructorId)) return approved;
    const current = instructors.find((instructor) => String(instructor.id) === instructorId);
    return current ? [...approved, current] : approved;
  }, [instructors, instructorId]);
  const assignmentByStudentId = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const batch of batches) {
      if (!batch.isActive) continue;
      if (initial?.id && batch.id === initial.id) continue;
      for (const studentId of batch.studentIds ?? []) {
        const names = map.get(studentId) ?? [];
        if (!names.includes(batch.name)) names.push(batch.name);
        map.set(studentId, names);
      }
    }
    return map;
  }, [batches, initial?.id]);
  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    return students.filter((student) => {
      const assignedBatches = assignmentByStudentId.get(student.id) ?? [];
      const assigned = assignedBatches.length > 0;
      if (studentFilter === "available" && assigned) return false;
      if (studentFilter === "assigned" && !assigned) return false;
      if (!query) return true;
      const studentName = student.name?.toLowerCase() ?? "";
      const roll = String(student.rollNo ?? "").toLowerCase();
      const batchName = assignedBatches.join(" ").toLowerCase();
      return studentName.includes(query) || roll.includes(query) || batchName.includes(query);
    });
  }, [students, studentQuery, studentFilter, assignmentByStudentId]);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setInstructorId(
      initial?.coordinatorInstructorId ? String(initial.coordinatorInstructorId) : "",
    );
    setSelectedStudentIds(initial?.studentIds ?? []);
    setStudentQuery("");
    setStudentFilter("all");
  }, [open, initial]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!instructorId) {
        throw new Error("Select a course instructor");
      }
      const payload = {
        name: name.trim(),
        studentIds: selectedStudentIds,
        coordinatorInstructorId: Number(instructorId),
      };
      if (initial?.id) return updateFranchiseBatch(initial.id, payload);
      return createFranchiseBatch(payload);
    },
    onSuccess: () => {
      toast.success(initial?.id ? "Batch updated" : "Batch created");
      onSaved();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save batch"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Batch" : "Create Batch"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Batch Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Level 1 – Morning Batch" />
          </div>
          <div className="space-y-2">
            <Label>Course Instructor *</Label>
            <Select value={instructorId || undefined} onValueChange={setInstructorId}>
              <SelectTrigger>
                <SelectValue placeholder={instructorsLoading ? "Loading instructors…" : "Select course instructor"} />
              </SelectTrigger>
              <SelectContent>
                {approvedInstructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={String(instructor.id)}>
                    {instructor.name}
                    {instructor.instructorId ? ` — ${instructor.instructorId}` : ""}
                    {instructor.phone ? ` · ${instructor.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Instructors sign in with their mobile number and 6-digit PIN.
            </p>
            {!instructorsLoading && approvedInstructors.length === 0 && (
              <p className="text-xs text-amber-700">
                No approved course instructors found for this franchise.{" "}
                <Link href="/franchisee/course-instructors" className="font-semibold underline">
                  Add a course instructor
                </Link>{" "}
                first, then assign them here.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Students</Label>
              <span className="text-xs text-muted-foreground">
                {selectedStudentIds.length} selected
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Search students by name or ID…"
                  className="pl-9"
                />
              </div>
              <Select
                value={studentFilter}
                onValueChange={(value) => setStudentFilter(value as StudentAssignmentFilter)}
              >
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-80 overflow-y-auto rounded-md border border-input bg-background">
              {filteredStudents.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {students.length === 0
                    ? "No students found for this franchise."
                    : "No students match your search or filter."}
                </p>
              ) : (
                filteredStudents.map((student) => {
                  const assignedBatches = assignmentByStudentId.get(student.id) ?? [];
                  const assigned = assignedBatches.length > 0;
                  const selected = selectedStudentIds.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) =>
                          setSelectedStudentIds((prev) =>
                            checked
                              ? [...prev, student.id]
                              : prev.filter((id) => id !== student.id),
                          )
                        }
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        {student.name} — {student.rollNo}
                      </span>
                      {assigned ? (
                        <Badge variant="secondary" className="shrink-0">
                          Assigned · {assignedBatches.join(", ")}
                        </Badge>
                      ) : null}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim() || !instructorId}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchesSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LearningBatch | null>(null);
  const [search, setSearch] = useState("");

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["franchise-learning-batches"],
    queryFn: () => fetchFranchiseBatches(false),
  });

  const visibleBatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return batches;
    return batches.filter((batch) => {
      const haystack = [
        batch.name,
        batch.coordinatorInstructorName,
        batch.coordinatorInstructorPhone,
        batch.coordinatorInstructorCode,
        ...(batch.students ?? []).flatMap((student) => [student.name, student.rollNo]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [batches, search]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["franchise-learning-batches"] });

  const deactivateMutation = useMutation({
    mutationFn: deactivateFranchiseBatch,
    onSuccess: () => { toast.success("Batch deactivated"); invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFranchiseBatch,
    onSuccess: () => { toast.success("Batch deleted"); invalidate(); },
    onError: (err: Error) => toast.error(err.message || "Cannot delete batch"),
  });

  const columns: DataTableColumn<LearningBatch>[] = useMemo(
    () => [
      { key: "count", header: "Students", render: (row) => row.studentCount },
      {
        key: "instructor",
        header: "Course Instructor",
        render: (row) =>
          row.coordinatorInstructorName
            ? `${row.coordinatorInstructorName}${row.coordinatorInstructorPhone ? ` · ${row.coordinatorInstructorPhone}` : ""}`
            : "—",
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge variant={row.isActive ? "default" : "secondary"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl shadow-2xs transition-all"
              onClick={() => {
                router.push(
                  `/franchisee/learning/attendance?openSchedule=true&batchId=${row.id}&batchName=${encodeURIComponent(row.name)}`,
                );
              }}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Schedule Class
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold rounded-xl shadow-2xs"
              onClick={() => {
                setEditing(row);
                setDialogOpen(true);
              }}
            >
              <PenLine className="h-3.5 w-3.5" />
              Edit
            </Button>
            {row.isActive && (
              <RowActionButton icon={Power} label="Deactivate" onClick={() => deactivateMutation.mutate(row.id)} />
            )}
            <RowActionButton
              icon={Trash2}
              label="Delete"
              tone="destructive"
              onClick={() => {
                if (confirm("Delete this batch?")) deleteMutation.mutate(row.id);
              }}
            />
          </div>
        ),
      },
    ],
    [deactivateMutation, deleteMutation, router],
  );

  return (
    <TablePageShell
      title="Batches"
      description="Group students for batch assignments."
      actions={
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Batch
        </Button>
      }
    >
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={visibleBatches}
          loading={isLoading}
          columns={columns}
          getRowId={(row) => String(row.id)}
          renderMainCell={(row) => <TableMainCell title={row.name} subtitle={`${row.studentCount} students`} />}
          searchPlaceholder="Search batches, instructors, or students..."
          onSearchChange={setSearch}
          emptyMessage={search.trim() ? "No batches match your search." : "No batches yet."}
          resultsText={(count, total) => `Showing ${count} of ${total} batches`}
        />
      )}
      <BatchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        batches={batches}
        onSaved={invalidate}
      />
    </TablePageShell>
  );
}

export default function FranchiseBatchesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BatchesSection />
    </Suspense>
  );
}
