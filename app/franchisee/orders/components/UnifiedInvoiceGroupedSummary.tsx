"use client";

import type { InvoicePreview } from "@/services/order.service";
import InvoiceGroupCard from "./checkout/InvoiceGroupCard";

export interface StartingKitRowSelection {
  streamId: number;
  streamName?: string;
  quantity: number;
}

export interface UnifiedInvoiceGroupedSummaryProps {
  preview: InvoicePreview;
  startingKitRows: StartingKitRowSelection[];
  selectedStudentIds: number[];
  selectedInstructorIds: number[];
  getStudentById: (id: number) => { name: string } | undefined;
  getInstructorById?: (
    id: number,
  ) => { name: string; instructorId?: string | number } | undefined;
  readOnly?: boolean;
  onRemoveKit?: (streamId: number) => void;
  onRemoveStudent?: (studentId: number) => void;
  onRemoveInstructor?: (instructorId: number) => void;
}

function displayInstructorCode(id: string | number | undefined | null): string {
  const t = String(id ?? "").trim();
  if (t === "" || t === "_") return "";
  return t;
}

function stripStudentLineDescription(description: string): string {
  const idx = description.indexOf(" - ");
  return idx !== -1 ? description.slice(idx + 3) : description;
}

export function studentLineItems(
  preview: InvoicePreview | undefined,
  studentId: number,
): Array<{ name: string; quantity: number }> {
  if (!preview) return [];
  const group = preview.studentGroups?.find((g) => g.studentId === studentId);
  if (group?.items?.length) {
    return group.items
      .filter((it) => it.itemType === "LEVEL" || it.itemType === "KIT")
      .map((it) => ({ name: it.name, quantity: it.quantity }));
  }
  return preview.lines
    .filter(
      (l) =>
        l.studentId === studentId &&
        (l.itemType === "LEVEL" || l.itemType === "KIT"),
    )
    .map((l) => ({
      name: stripStudentLineDescription(l.description),
      quantity: l.quantity,
    }));
}

function studentBreakdown(preview: InvoicePreview, studentId: number) {
  return preview.students.find((x) => x.studentId === studentId);
}

export default function UnifiedInvoiceGroupedSummary({
  preview,
  startingKitRows,
  selectedStudentIds,
  selectedInstructorIds,
  getStudentById,
  getInstructorById,
  readOnly = false,
  onRemoveKit,
  onRemoveStudent,
  onRemoveInstructor,
}: UnifiedInvoiceGroupedSummaryProps) {
  const selectedKitsTotalQty = startingKitRows.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-6">
      {startingKitRows.length > 0 &&
        (preview.startingKitGroups?.length ?? 0) > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Kits
              </h4>
              <span className="text-xs text-muted-foreground">
                {selectedKitsTotalQty}{" "}
                {selectedKitsTotalQty === 1 ? "kit" : "kits"}
              </span>
            </div>
            <div className="space-y-3">
              {(preview.startingKitGroups ?? []).map((g) => (
                <InvoiceGroupCard
                  key={g.streamId}
                  kind="KIT"
                  title={g.streamName}
                  kitQty={g.quantity}
                  costs={[
                    { label: "Material cost", unit: g.materialUnit },
                    { label: "Kit cost", unit: g.kitUnit },
                    { label: "Royalty", unit: g.royaltyUnit },
                  ]}
                  items={g.items.map((it) => ({
                    name: it.name,
                    quantity: it.quantity,
                  }))}
                  totalAmount={
                    (g.materialUnit + g.kitUnit + g.royaltyUnit) * g.quantity
                  }
                  readOnly={readOnly}
                  onRemove={
                    readOnly || !onRemoveKit ? undefined : () => onRemoveKit(g.streamId)
                  }
                  removeAriaLabel={`Remove starting kit ${g.streamName} from invoice`}
                />
              ))}
            </div>
          </div>
        )}

      {selectedStudentIds.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Students
            </h4>
            <span className="text-xs text-muted-foreground">
              {selectedStudentIds.length}{" "}
              {selectedStudentIds.length === 1 ? "student" : "students"}
            </span>
          </div>
          <div className="space-y-3">
            {selectedStudentIds.map((sid) => {
              const student = getStudentById(sid);
              const bd = studentBreakdown(preview, sid);
              const title = student?.name ?? bd?.studentName ?? `Student #${sid}`;
              if (!bd) {
                return (
                  <div
                    key={sid}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
                  >
                    {readOnly ? title : "Loading…"}
                  </div>
                );
              }
              const costs = [];
              if (bd.materialCost > 0) {
                costs.push({
                  label: "Material cost",
                  amount: bd.materialCost,
                });
              }
              if (bd.kitCost > 0) {
                costs.push({
                  label: "Starting kit",
                  amount: bd.kitCost,
                });
              }
              if (bd.royalty > 0) {
                costs.push({
                  label: "Royalty",
                  amount: bd.royalty,
                });
              }
              return (
                <InvoiceGroupCard
                  key={sid}
                  kind="STUDENT"
                  title={title}
                  subtitle={(() => {
                    const n = String(bd.levelName ?? "").trim();
                    if (!n || n === "_") return undefined;
                    return n;
                  })()}
                  costs={costs}
                  items={studentLineItems(preview, sid)}
                  totalAmount={bd.totalPrice}
                  readOnly={readOnly}
                  onRemove={
                    readOnly || !onRemoveStudent
                      ? undefined
                      : () => onRemoveStudent(sid)
                  }
                  removeAriaLabel={`Remove student ${title} from invoice`}
                />
              );
            })}
          </div>
        </div>
      )}

      {selectedInstructorIds.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Instructors
            </h4>
            <span className="text-xs text-muted-foreground">
              {selectedInstructorIds.length} instructor
              {selectedInstructorIds.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {selectedInstructorIds.map((iid) => {
              const ins = getInstructorById?.(iid);
              const grp = preview.instructorGroups?.find(
                (g) => g.instructorId === iid,
              );
              return (
                <InvoiceGroupCard
                  key={iid}
                  kind="CI"
                  title={ins?.name ?? grp?.name ?? "Instructor"}
                  subtitle={(() => {
                    const raw = ins?.instructorId ?? grp?.instructorCode;
                    const s = displayInstructorCode(raw);
                    return s || undefined;
                  })()}
                  free
                  items={
                    grp?.items?.length
                      ? grp.items.map((it) => ({
                          name: it.name,
                          quantity: it.quantity,
                        }))
                      : []
                  }
                  totalAmount={0}
                  readOnly={readOnly}
                  onRemove={
                    readOnly || !onRemoveInstructor
                      ? undefined
                      : () => onRemoveInstructor(iid)
                  }
                  removeAriaLabel={`Remove instructor ${ins?.name ?? grp?.name ?? "unknown"} from invoice`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
