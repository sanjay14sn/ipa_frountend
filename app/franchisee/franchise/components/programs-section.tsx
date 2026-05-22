"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
  TablePageShell,
  TableLoadingState,
} from "@/components/shared";
import {
  listProgramRequests,
  cancelProgramRequest,
  type ProgramRequestItem,
} from "@/services/program-request.service";
import { RequestProgramsModal } from "@/components/request-programs-modal";
import { useUser } from "@/context/user-context";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";

// ---------------------------------------------------------------------------
// Status badge — mirrors the 3-value ProgramRequest enum:
// Pending → Approved | Rejected.
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "bg-blue-100 text-blue-800",
    Approved: "bg-amber-100 text-amber-800",
    Rejected: "bg-red-100 text-red-800",
  };
  return <Badge className={colors[status] ?? ""}>{status}</Badge>;
}

// ---------------------------------------------------------------------------
// ProgramsSection
// ---------------------------------------------------------------------------
export function ProgramsSection() {
  const { user } = useUser();
  const franchiseId = user?.franchiseId;
  const [requests, setRequests] = useState<ProgramRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProgramRequests();
      const filtered = franchiseId
        ? data.filter((r) => r.franchiseId === franchiseId)
        : data;
      setRequests(filtered);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load programs"));
    } finally {
      setLoading(false);
    }
  }, [franchiseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await cancelProgramRequest(id);
      toast.success("Request cancelled");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to cancel request"));
    } finally {
      setCancelling(null);
    }
  };

  const columns: DataTableColumn<ProgramRequestItem>[] = [
    {
      key: "program",
      header: "Program",
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "requestedAt",
      header: "Requested",
      className: "text-sm text-muted-foreground whitespace-nowrap",
      render: (r) =>
        r.requestedAt
          ? new Date(r.requestedAt).toLocaleDateString()
          : "-",
    },
    {
      key: "actions",
      header: "",
      className: "w-44",
      render: (r) => {
        if (r.status !== "Pending") return null;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={cancelling === r.id}
              onClick={() => handleCancel(r.id)}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <TablePageShell
      title="Programs"
      description="Manage program requests for your franchise."
      actions={
        <Button onClick={() => setRequestModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Request Program
        </Button>
      }
    >
      {loading && requests.length === 0 ? (
        <TableLoadingState message="Loading programs..." />
      ) : (
        <DataTable<ProgramRequestItem>
          data={requests}
          loading={loading}
          columns={columns}
          getRowId={(r) => String(r.id)}
          renderMainCell={(r) => (
            <div className="flex flex-col">
              <span className="font-medium">
                {r.program?.name ?? `Program #${r.programId}`}
              </span>
              {r.franchise?.name ? (
                <span className="text-sm text-muted-foreground">
                  {r.franchise.name}
                </span>
              ) : null}
            </div>
          )}
          emptyMessage="No program requests yet. Click 'Request Program' to get started."
          resultsText={(_count, total) =>
            `${total} request${total === 1 ? "" : "s"}`
          }
        />
      )}

      <RequestProgramsModal
        open={requestModalOpen}
        onOpenChange={(open) => {
          setRequestModalOpen(open);
          if (!open) load();
        }}
      />
    </TablePageShell>
  );
}
