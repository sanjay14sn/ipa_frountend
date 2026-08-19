"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge, TableMainCell } from "@/components/shared";
import type { DataTableColumn, StatusTone } from "@/components/shared";
import type {
  CertificateFranchiseSummary,
  IdCardFranchiseSummary,
} from "@/services/student.service";
import {
  useAdminCertificateSummaries,
  useAdminIdCardSummaries,
} from "@/hooks/api/student.hooks";
import { usePaginatedListState } from "@/hooks/use-paginated-list-state";
import FranchiseIdDetails from "./ids/FranchiseIdDetails";
import FranchiseCertificateDetails from "./certificates/FranchiseCertificateDetails";

export interface RequestReviewTableProps {
  /** Switches query hook, columns, and the row-detail panel. */
  kind: "id" | "certificate";
  /** Franchise-detail embedded usage. */
  scopedFranchiseId?: string;
  /** Kept for the id tab's existing invalidation pattern. */
  refreshTrigger?: number;
  onActionSuccess?: () => void;
}

/** Non-zero counts get a toned badge; zero stays quiet. */
function countCell(value: number, tone: StatusTone) {
  return value > 0 ? (
    <StatusBadge tone={tone} label={String(value)} />
  ) : (
    <span className="text-sm text-muted-foreground">—</span>
  );
}

/** Approvals outrank dispatches — a franchise with both says "Approve". */
function nextActionLabel(g: CertificateFranchiseSummary): string {
  if (g.totalPending > 0) return `Approve ${g.totalPending}`;
  if (g.totalReadyToDispatch > 0) return `Dispatch ${g.totalReadyToDispatch}`;
  return "Up to date";
}

/**
 * One per-franchise request-review table (CMP-11) — the former
 * RequestedIdTable / AdminCertificateRequestsTable pair merged behind `kind`.
 */
export default function RequestReviewTable({
  kind,
  scopedFranchiseId,
  refreshTrigger = 0,
  onActionSuccess,
}: RequestReviewTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const limit = 10;

  const requestParams = useMemo(
    () => ({
      page: currentPage,
      limit,
      search: searchTerm || undefined,
      ...(scopedFranchiseId?.trim()
        ? { franchiseId: scopedFranchiseId.trim() }
        : {}),
    }),
    [currentPage, searchTerm, scopedFranchiseId],
  );

  const idQuery = useAdminIdCardSummaries(requestParams, refreshTrigger, {
    enabled: kind === "id",
  });
  const certQuery = useAdminCertificateSummaries(requestParams, {
    enabled: kind === "certificate",
  });
  const idState = usePaginatedListState(idQuery);
  const certState = usePaginatedListState(certQuery);
  const {
    rows: summaries,
    total,
    totalPages,
    loading,
  } = kind === "id" ? idState : certState;

  const columns: DataTableColumn<
    IdCardFranchiseSummary | CertificateFranchiseSummary
  >[] =
    kind === "id"
      ? [
          { key: "franchise", header: "Franchise", className: "w-[280px]" },
          {
            key: "requested",
            header: "Requested",
            className: "text-center",
            render: (g) => (
              <Badge variant="secondary">
                {(g as IdCardFranchiseSummary).totalRequested}
              </Badge>
            ),
          },
          {
            key: "issued",
            header: "Issued",
            className: "text-center",
            render: (g) => (
              <StatusBadge tone="success" label={String(g.totalIssued)} />
            ),
          },
        ]
      : [
          { key: "franchise", header: "Franchise", className: "w-[280px]" },
          {
            key: "requested",
            header: "Requested",
            className: "text-center",
            render: (g) =>
              countCell(
                (g as CertificateFranchiseSummary).totalPending,
                "warning",
              ),
          },
          {
            key: "readyToDispatch",
            header: "Ready to dispatch",
            className: "text-center",
            render: (g) =>
              countCell(
                (g as CertificateFranchiseSummary).totalReadyToDispatch,
                "info",
              ),
          },
          {
            key: "dispatched",
            header: "Dispatched",
            className: "text-center",
            render: (g) =>
              countCell(
                (g as CertificateFranchiseSummary).totalDispatched,
                "success",
              ),
          },
          {
            key: "nextAction",
            header: "Next action",
            className: "text-center",
            render: (g) => (
              <span className="text-sm text-muted-foreground">
                {nextActionLabel(g as CertificateFranchiseSummary)}
              </span>
            ),
          },
        ];

  const certTotals =
    kind === "certificate" ? certQuery.data?.totals : undefined;

  return (
    <>
      {kind === "certificate" && !scopedFranchiseId && certTotals ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>
            Across {total} franchise{total !== 1 ? "s" : ""}:
          </span>
          <StatusBadge tone="warning" label={String(certTotals.totalPending)} />
          <span>requested</span>
          <StatusBadge
            tone="info"
            label={String(certTotals.totalReadyToDispatch)}
          />
          <span>ready to dispatch</span>
          <StatusBadge
            tone="success"
            label={String(certTotals.totalDispatched)}
          />
          <span>dispatched</span>
        </div>
      ) : null}
      <DataTable
      data={summaries}
      loading={loading}
      columns={columns}
      getRowId={(g) => g.franchiseId}
      renderMainCell={(g) => <TableMainCell title={g.franchiseName} />}
      renderExpandedContent={(g) =>
        kind === "id" ? (
          <FranchiseIdDetails
            franchiseId={g.franchiseId}
            franchiseName={g.franchiseName}
            onIssueSuccess={onActionSuccess}
          />
        ) : (
          <FranchiseCertificateDetails
            franchiseId={g.franchiseId}
            franchiseName={g.franchiseName}
            counts={{
              pending: (g as CertificateFranchiseSummary).totalPending,
              ready: (g as CertificateFranchiseSummary).totalReadyToDispatch,
              dispatched: (g as CertificateFranchiseSummary).totalDispatched,
              rejected: (g as CertificateFranchiseSummary).totalRejected,
            }}
          />
        )
      }
      searchPlaceholder={
        kind === "id"
          ? "Search students, roll numbers, or franchises..."
          : "Search by student name, roll number, instructor, or franchise..."
      }
      onSearchChange={(value) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={limit}
      emptyMessage={
        kind === "id"
          ? "No ID request activity found for franchises"
          : "No certificate request activity found for franchises"
      }
      resultsText={(_, t) =>
        `${t} franchise${t !== 1 ? "es" : ""} with ${
          kind === "id" ? "ID" : "certificate"
        } requests`
      }
      />
    </>
  );
}
