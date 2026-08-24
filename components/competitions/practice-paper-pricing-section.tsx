"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, PlusCircle, Trash2 } from "lucide-react";

import { api } from "@/lib/axios";
import { formatRupees } from "@/lib/currency-utils";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTable,
  RowActionButton,
  StatusBadge,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
} from "@/components/shared";

export type PracticePaperPricingPlan = {
  id: number;
  name: string;
  description: string | null;
  paidQuestionPapers: number;
  bonusQuestionPapers: number;
  priceInr: number;
  isActive: boolean;
  displayOrder: number;
  startsAt: string | null;
  endsAt: string | null;
};

type PlanFormValues = {
  name: string;
  description: string;
  paidQuestionPapers: number;
  bonusQuestionPapers: number;
  priceInr: number;
  isActive: boolean;
  displayOrder: number;
};

const PRESETS: Array<{ label: string; values: PlanFormValues }> = [
  {
    label: "15 QPs · ₹99",
    values: {
      name: "15 Question Papers",
      description: "Starter pack",
      paidQuestionPapers: 15,
      bonusQuestionPapers: 0,
      priceInr: 99,
      isActive: true,
      displayOrder: 1,
    },
  },
  {
    label: "20 QPs · ₹130",
    values: {
      name: "20 Question Papers",
      description: "Value pack",
      paidQuestionPapers: 20,
      bonusQuestionPapers: 0,
      priceInr: 130,
      isActive: true,
      displayOrder: 2,
    },
  },
  {
    label: "50 + 10 · ₹200",
    values: {
      name: "Mega Offer",
      description: "50 question papers + 10 bonus",
      paidQuestionPapers: 50,
      bonusQuestionPapers: 10,
      priceInr: 200,
      isActive: true,
      displayOrder: 3,
    },
  },
];

function PlanForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: PracticePaperPricingPlan | null;
  onSubmit: (values: PlanFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [values, setValues] = useState<PlanFormValues>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    paidQuestionPapers: initial?.paidQuestionPapers ?? 15,
    bonusQuestionPapers: initial?.bonusQuestionPapers ?? 0,
    priceInr: Number(initial?.priceInr ?? 99),
    isActive: initial?.isActive ?? true,
    displayOrder: initial?.displayOrder ?? 0,
  });

  const totalCredits = values.paidQuestionPapers + values.bonusQuestionPapers;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <DialogHeader>
        <DialogTitle>{initial ? "Edit pricing plan" : "Create pricing plan"}</DialogTitle>
        <DialogDescription>
          Question paper packs are sold globally. Students unlock QPs from their mapped paper.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {!initial && (
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValues(preset.values)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="planName">Plan name</Label>
          <Input
            id="planName"
            value={values.name}
            onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="planDescription">Description</Label>
          <Input
            id="planDescription"
            value={values.description}
            onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="paidQps">Paid question papers</Label>
            <Input
              id="paidQps"
              type="number"
              min={1}
              value={values.paidQuestionPapers}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  paidQuestionPapers: Number(e.target.value),
                }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bonusQps">Bonus question papers</Label>
            <Input
              id="bonusQps"
              type="number"
              min={0}
              value={values.bonusQuestionPapers}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  bonusQuestionPapers: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="priceInr">Price (₹)</Label>
            <Input
              id="priceInr"
              type="number"
              min={0}
              value={values.priceInr}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, priceInr: Number(e.target.value) }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="displayOrder">Display order</Label>
            <Input
              id="displayOrder"
              type="number"
              min={0}
              value={values.displayOrder}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))
              }
            />
          </div>
        </div>

        <Label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={values.isActive}
            onCheckedChange={(checked) =>
              setValues((prev) => ({ ...prev, isActive: checked === true }))
            }
          />
          <span className="text-sm">Active</span>
        </Label>

        <p className="text-xs text-muted-foreground">
          Total credits granted: <strong>{totalCredits}</strong> question paper
          {totalCredits === 1 ? "" : "s"}
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : initial ? "Update plan" : "Create plan"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PracticePaperPricingSection() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PracticePaperPricingPlan | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["practice-paper-pricing-plans"],
    queryFn: async () => {
      const res = await api.get("/competitions/practice-pricing/plans");
      return (res.data?.result || res.data?.data || res.data || []) as PracticePaperPricingPlan[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: PlanFormValues) => {
      const payload = {
        ...values,
        description: values.description || undefined,
      };
      if (editing) {
        return api.put(`/competitions/practice-pricing/plans/${editing.id}`, payload);
      }
      return api.post("/competitions/practice-pricing/plans", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-paper-pricing-plans"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Plan updated" : "Plan created");
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Failed to save plan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/competitions/practice-pricing/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-paper-pricing-plans"] });
      toast.success("Plan deleted");
    },
    onError: () => toast.error("Failed to delete plan"),
  });

  const rows = plans ?? [];

  const columns: DataTableColumn<PracticePaperPricingPlan>[] = useMemo(
    () => [
      {
        key: "paidQuestionPapers",
        header: "Paid QPs",
        className: "w-[90px]",
        render: (row) => <span className="tabular-nums">{row.paidQuestionPapers}</span>,
      },
      {
        key: "bonusQuestionPapers",
        header: "Bonus",
        className: "w-[80px]",
        render: (row) => <span className="tabular-nums">{row.bonusQuestionPapers}</span>,
      },
      {
        key: "totalCredits",
        header: "Total credits",
        className: "w-[110px]",
        render: (row) => (
          <span className="font-semibold tabular-nums">
            {row.paidQuestionPapers + row.bonusQuestionPapers}
          </span>
        ),
      },
      {
        key: "priceInr",
        header: "Price",
        className: "w-[100px]",
        render: (row) => (
          <span className="font-mono tabular-nums">{formatRupees(row.priceInr)}</span>
        ),
      },
      {
        key: "displayOrder",
        header: "Order",
        className: "w-[70px]",
        render: (row) => <span className="tabular-nums">{row.displayOrder}</span>,
      },
      {
        key: "isActive",
        header: "Status",
        className: "w-[100px]",
        render: (row) => (
          <StatusBadge label={row.isActive ? "Active" : "Inactive"} />
        ),
      },
      {
        key: "actions",
        header: "",
        className: "w-[96px]",
        render: (row) => (
          <div className="flex justify-end gap-0.5">
            <RowActionButton
              icon={Edit2}
              label="Edit plan"
              onClick={() => {
                setEditing(row);
                setDialogOpen(true);
              }}
            />
            <RowActionButton
              icon={Trash2}
              label="Delete plan"
              tone="destructive"
              onClick={() => deleteMutation.mutate(row.id)}
            />
          </div>
        ),
      },
    ],
    [deleteMutation],
  );

  return (
    <TablePageShell
      embed
      title="Practice pricing"
      description="Configure global question-paper packs and offers. Students buy credits and unlock QPs from their level-mapped paper."
      actions={
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add plan
        </Button>
      }
    >
      <DataTable
        data={rows}
        loading={isLoading}
        columns={columns}
        getRowId={(row) => String(row.id)}
        renderMainCell={(row) => <TableMainCell title={row.name} subtitle={row.description || undefined} />}
        emptyState={{
          title: "No pricing plans yet",
          hint: "Create packs like 15 QPs for ₹99 or 50+10 for ₹200.",
          action: (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add plan
            </Button>
          ),
        }}
        resultsText={(count) => `${count} plan${count === 1 ? "" : "s"}`}
        tableClassName="table-fixed"
        columnGroupWidths={["90px", "80px", "110px", "100px", "70px", "100px", "96px"]}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <PlanForm
            initial={editing}
            isPending={saveMutation.isPending}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
            onSubmit={(values) => saveMutation.mutate(values)}
          />
        </DialogContent>
      </Dialog>
    </TablePageShell>
  );
}
