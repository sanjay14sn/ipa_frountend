"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { RequestedIdDetail } from "@/services/student.service";
import StudentsSection from "@/app/admin/students/components/StudentsSection";
import IdCardPreviewModal from "./IdCardPreviewModal";
import {
  useAdminIdCardDetails,
  useBulkDispatchIdCards,
  useDispatchEligibleOrders,
} from "@/hooks/api/student.hooks";
import {
  BulkDispatchPickerModal,
  type DispatchPickerItem,
} from "@/components/shared/BulkDispatchPickerModal";

interface FranchiseIdDetailsProps {
  franchiseId: string;
  franchiseName: string;
  totalRequested: number;
  totalIssued: number;
  onIssueSuccess?: () => void;
}

export default function FranchiseIdDetails({
  franchiseId,
  franchiseName,
  totalRequested,
  totalIssued,
  onIssueSuccess,
}: FranchiseIdDetailsProps) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const [statusFilter, setStatusFilter] = useState<"all" | "Requested" | "Issued">(
    "all",
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<RequestedIdDetail | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set(),
  );
  const [dateFilter, setDateFilter] = useState("");
  const [dispatchOpen, setDispatchOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const apiStatus = useMemo(() => {
    if (statusFilter === "all") return "all";
    return statusFilter;
  }, [statusFilter]);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: searchTerm || undefined,
      status: apiStatus,
      sortBy: "id",
      sortOrder: "DESC" as const,
    }),
    [page, searchTerm, apiStatus],
  );

  const detailsQuery = useAdminIdCardDetails(franchiseId, queryParams);
  const bulkDispatchIds = useBulkDispatchIdCards();
  const eligibleQuery = useDispatchEligibleOrders(franchiseId, dispatchOpen);
  const students = detailsQuery.data?.data ?? [];
  const pendingIdDispatchItems: DispatchPickerItem[] = useMemo(() => {
    return students
      .filter((s) => {
        const isPending =
          statusFilter === "Requested" ||
          (statusFilter === "all" && s.idIssued === "Requested");
        if (!isPending || s.id == null) return false;
        if (!dateFilter) return true;
        return (s.idRequestedAt ?? "").slice(0, 10) === dateFilter;
      })
      .map((s) => ({
        id: s.id!,
        label: s.name,
        sublabel: s.rollNo,
        requestDate: (s.idRequestedAt ?? "").slice(0, 10) || "—",
      }));
  }, [students, dateFilter, statusFilter]);
  const totalStudents = detailsQuery.data?.meta.total ?? 0;
  const totalPages = detailsQuery.data?.meta.totalPages ?? 1;
  const loading = detailsQuery.isLoading && !detailsQuery.data;

  const toggleRow = (id: string) => {
    const next = new Set(expandedChildren);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedChildren(next);
  };

  const handleIssueId = (student: RequestedIdDetail) => {
    setSelectedStudent(student);
    setPreviewOpen(true);
  };

  return (
    <ExpandedDetailSurface className="border-t border-border/60">
      <ExpandedDetailSection title="ID request summary">
        <DetailFieldsGrid columns={4}>
          <DetailField label="Franchise" value={franchiseName} />
          <DetailField label="Requested" value={totalRequested} />
          <DetailField label="Issued" value={totalIssued} />
          <DetailField label="Students on page" value={students.length} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Students">
        <div className="mb-3 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll number, or franchise..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {(["all", "Requested", "Issued"] as const).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                >
                  {s === "all" ? "All" : s}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-end sm:self-center">
            <span className="text-sm text-muted-foreground">Request date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
            <Button
              size="sm"
              variant="default"
              className="h-8 shrink-0"
              onClick={() => setDispatchOpen(true)}
              disabled={pendingIdDispatchItems.length === 0}
            >
              Dispatch ID cards
            </Button>
          </div>
        </div>

        {!franchiseId?.trim() ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No franchise selected.
          </p>
        ) : loading ? (
          <Table>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : students.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No students found for this filter.
          </p>
        ) : (
          <StudentsSection
            students={students}
            franchiseName={franchiseName}
            isExpanded
            onToggle={toggleRow}
            onIssueId={handleIssueId}
            statusFilter={statusFilter}
            expandedRows={expandedChildren}
          />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-2 py-3">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({totalStudents} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </ExpandedDetailSection>

      {selectedStudent && (
        <IdCardPreviewModal
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) setSelectedStudent(null);
          }}
          student={selectedStudent}
          onSuccess={() => {
            setPreviewOpen(false);
            setSelectedStudent(null);
            void detailsQuery.refetch();
            onIssueSuccess?.();
          }}
        />
      )}

      <BulkDispatchPickerModal
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        title="ID cards"
        items={pendingIdDispatchItems}
        eligibleOrders={eligibleQuery.data ?? []}
        isLoadingOrders={eligibleQuery.isLoading}
        onConfirm={async (selectedIds, orderId) => {
          await bulkDispatchIds.mutateAsync({
            studentIds: selectedIds,
            orderId: orderId ?? undefined,
          });
          await detailsQuery.refetch();
          onIssueSuccess?.();
        }}
      />
    </ExpandedDetailSurface>
  );
}
