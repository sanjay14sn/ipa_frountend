"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CalendarDays, PlusCircle, Power, Trash2, Users } from "lucide-react";
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
  DataTable,
  PageSkeleton,
  RowActionButton,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
} from "@/components/shared";
import { useStudents } from "@/hooks/api/student.hooks";
import {
  createFranchiseBatch,
  deactivateFranchiseBatch,
  deleteFranchiseBatch,
  fetchFranchiseBatches,
  updateFranchiseBatch,
  type LearningBatch,
} from "@/services/learning.service";

function BatchDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: LearningBatch | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>(
    initial?.studentIds ?? [],
  );
  const { students } = useStudents();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), studentIds: selectedStudentIds };
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Batch" : "Create Batch"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Batch Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Level 1 – Morning Batch" />
          </div>
          <div className="space-y-2">
            <Label>Students</Label>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {students.map((student) => (
                <label key={student.id} className="flex items-center gap-3 rounded-lg border p-2 cursor-pointer">
                  <Checkbox
                    checked={selectedStudentIds.includes(student.id)}
                    onCheckedChange={(checked) =>
                      setSelectedStudentIds((prev) =>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
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

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["franchise-learning-batches"],
    queryFn: () => fetchFranchiseBatches(false),
  });

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
            <RowActionButton icon={Users} label="Edit" onClick={() => { setEditing(row); setDialogOpen(true); }} />
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
          data={batches}
          loading={isLoading}
          columns={columns}
          getRowId={(row) => String(row.id)}
          renderMainCell={(row) => <TableMainCell title={row.name} subtitle={`${row.studentCount} students`} />}
          emptyMessage="No batches yet."
        />
      )}
      <BatchDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSaved={invalidate} />
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
