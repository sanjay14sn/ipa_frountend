"use client";

import { useState } from "react";
import { CalendarClock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  DialogFormField,
  FormDialog,
} from "@/components/shared/dialog";
import type { StudentLifecycleRow } from "@/services/student.service";
import { formatEntityCodeForDisplay } from "@/lib/format-entity-code";

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
      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 whitespace-nowrap px-2 text-xs"
          onClick={() => setMode("extend")}
          disabled={busy}
        >
          Extend
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 whitespace-nowrap px-2 text-xs"
          onClick={() => setMode("reactivate")}
          disabled={busy || student.isActive}
        >
          Reactivate
        </Button>
      </div>

      <FormDialog
        open={mode != null}
        onOpenChange={(open) => !open && setMode(null)}
        size="md"
        title={title}
        description={description}
        headerIcon={mode === "reactivate" ? RotateCcw : CalendarClock}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        submitLabel="Save"
        canSubmit={!busy && !!extendedUntil}
        isSubmitting={busy}
      >
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="font-medium text-foreground">{student.name}</div>
          <div className="text-muted-foreground" title={student.rollNo}>
            {formatEntityCodeForDisplay(student.rollNo)} ·{" "}
            {student.levelName || "Current level"}
          </div>
        </div>
        <DialogFormField
          id={`extended-until-${student.studentId}`}
          label="Extended until"
          required
        >
          <DateInput
            id={`extended-until-${student.studentId}`}
            min={tomorrowDate()}
            value={extendedUntil}
            onChange={(v) => setExtendedUntil(v)}
          />
        </DialogFormField>
      </FormDialog>
    </>
  );
}
