"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
  TablePageShell,
} from "@/components/shared";
import {
  listProgramRequests,
  cancelProgramRequest,
  type ProgramRequestItem,
} from "@/services/program-request.service";
import { queryKeys } from "@/hooks/api/query-keys";
import { RequestProgramsModal } from "@/components/request-programs-modal";
import { useUser } from "@/context/user-context";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";

// ---------------------------------------------------------------------------
// ProgramsSection
// ---------------------------------------------------------------------------
export function ProgramsSection() {
  const { user } = useUser();
  const franchiseId = user?.franchiseId;
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  // FR-08: query-driven load (was a useEffect/useState fetch) — real
  // isLoading/isError drive the table's skeleton and error states, and the
  // franchise scope keying refetches on scope switch.
  const requestsQuery = useQuery({
    queryKey: queryKeys.programRequests.franchisee({ franchiseId }),
    queryFn: async () => {
      const data = await listProgramRequests();
      return franchiseId
        ? data.filter((r) => r.franchiseId === franchiseId)
        : data;
    },
  });
  const requests = requestsQuery.data ?? [];
  const loading = requestsQuery.isLoading;

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await cancelProgramRequest(id);
      toast.success("Request cancelled");
      void requestsQuery.refetch();
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
      // FR-07: shared StatusBadge semantics — Approved green, Pending amber,
      // Rejected red (the old local badge rendered Approved as amber).
      key: "status",
      header: "Status",
      className: "text-center",
      render: (r) => <StatusBadge label={r.status} />,
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
      <DataTable<ProgramRequestItem>
          data={requests}
          loading={loading}
          columns={columns}
          getRowId={(r) => String(r.id)}
          renderMainCell={(r) => (
            <span className="font-medium">
              {r.program?.name ?? "—"}
            </span>
          )}
          renderExpandedContent={(r) => (
            <ExpandedDetailSurface>
              <ExpandedDetailSection title="Request details">
                <DetailFieldsGrid columns={3}>
                  <DetailField
                    label="Program"
                    value={r.program?.name ?? "—"}
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
          error={requestsQuery.error}
          onRetry={() => void requestsQuery.refetch()}
          errorMessage="Couldn't load program requests."
          emptyMessage="No program requests yet. Click 'Request Program' to get started."
          resultsText={(_count, total) =>
            `${total} request${total === 1 ? "" : "s"}`
          }
        />

      <RequestProgramsModal
        open={requestModalOpen}
        onOpenChange={(open) => {
          setRequestModalOpen(open);
          if (!open) void requestsQuery.refetch();
        }}
      />
    </TablePageShell>
  );
}
