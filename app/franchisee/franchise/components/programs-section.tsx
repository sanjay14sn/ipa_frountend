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

// Status badge color helper
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Requested: "bg-blue-100 text-blue-800",
    TermsSet: "bg-yellow-100 text-yellow-800",
    PendingSignature: "bg-orange-100 text-orange-800",
    Active: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
    Cancelled: "bg-gray-100 text-gray-600",
  };
  return (
    <Badge className={colors[status] ?? ""}>{status}</Badge>
  );
}

export function ProgramsSection() {
  const { user } = useUser();
  const [requests, setRequests] = useState<ProgramRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProgramRequests();
      // Filter to current franchise
      const filtered =
        user?.franchiseId
          ? data.filter((r) => r.franchiseId === user.franchiseId)
          : data;
      setRequests(filtered);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load programs"));
    } finally {
      setLoading(false);
    }
  }, [user?.franchiseId]);

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
      // First column — header only; body rendered via renderMainCell
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
      className: "w-28",
      render: (r) => {
        const canCancel = ["Requested", "TermsSet", "PendingSignature"].includes(
          r.status
        );
        if (!canCancel) return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={cancelling === r.id}
            onClick={() => handleCancel(r.id)}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
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
