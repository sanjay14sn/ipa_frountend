"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StudentLifecycleRow } from "@/services/student.service";

interface StudentLifecycleActionsProps {
  student: StudentLifecycleRow;
  onExtend: (studentId: number, extendedUntil: string) => Promise<void>;
  onReactivate: (studentId: number, extendedUntil: string) => Promise<void>;
  busy?: boolean;
}

type ActionMode = "extend" | "reactivate" | null;

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function StudentLifecycleActions({
  student,
  onExtend,
  onReactivate,
  busy = false,
}: StudentLifecycleActionsProps) {
  const [mode, setMode] = useState<ActionMode>(null);
  const [extendedUntil, setExtendedUntil] = useState(student.lifecycleExtendedUntil ?? tomorrowDate());

  const title = mode === "reactivate" ? "Reactivate student" : "Extend course time";
  const description =
    mode === "reactivate"
      ? "Choose a future deadline. The student will become active and remain protected until this date."
      : "Choose a future deadline. The lifecycle job will not invalidate this student before that date.";

  async function submit() {
    if (!mode || !extendedUntil) return;
    if (mode === "reactivate") {
      await onReactivate(student.studentId, extendedUntil);
    } else {
      await onExtend(student.studentId, extendedUntil);
    }
    setMode(null);
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode("extend")}
          disabled={busy}
        >
          Extend time
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => setMode("reactivate")}
          disabled={busy || student.isActive}
        >
          Reactivate
        </Button>
      </div>

      <Dialog open={mode != null} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-medium text-foreground">{student.name}</div>
              <div className="text-muted-foreground">
                {student.rollNo} · {student.levelName || "Current level"}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`extended-until-${student.studentId}`}>Extended until</Label>
              <Input
                id={`extended-until-${student.studentId}`}
                type="date"
                min={tomorrowDate()}
                value={extendedUntil}
                onChange={(event) => setExtendedUntil(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={busy || !extendedUntil}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
