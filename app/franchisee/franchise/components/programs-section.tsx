"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
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
      className: "text-center",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[120px] text-center",
      render: (r) => {
        if (r.status !== "Pending") return null;
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Cancel request"
            disabled={cancelling === r.id}
            onClick={() => handleCancel(r.id)}
          >
            <X className="h-4 w-4" />
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
            <span className="font-medium">
              {r.program?.name ?? `Program #${r.programId}`}
            </span>
          )}
          renderExpandedContent={(r) => (
            <ExpandedDetailSurface>
              <ExpandedDetailSection title="Request details">
                <DetailFieldsGrid columns={3}>
                  <DetailField
                    label="Program"
                    value={r.program?.name ?? `#${r.programId}`}
                  />
                  <DetailField
                    label="Franchise"
                    value={r.franchise?.name ?? "—"}
                  />
                  <DetailField label="Status" value={r.status} />
                  <DetailField
                    label="Requested"
                    value={
                      r.requestedAt
                        ? new Date(r.requestedAt).toLocaleString()
                        : "—"
                    }
                  />
                </DetailFieldsGrid>
              </ExpandedDetailSection>
            </ExpandedDetailSurface>
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
