"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/date-utils";
import {
  Building2,
  CalendarDays,
  Eye,
  IdCard,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { DetailDialog } from "@/components/shared/dialog";
import {
  ContactPill,
  ContactPillGrid,
  DataTable,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  IdentityHeader,
  LabeledValue,
  ProfileCard,
  ProfileCardSection,
  TableMainCell,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import { RequestedIdDetail } from "@/services/student.service";
import { formatEntityCodeForDisplay } from "@/lib/format-entity-code";
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
  onIssueSuccess?: () => void;
}

function showIssueButton(student: RequestedIdDetail, statusFilter: string) {
  if (statusFilter === "Requested") return true;
  if (statusFilter === "all") return student.idIssued === "Requested";
  return false;
}

function formatIssueDate(student: RequestedIdDetail) {
  if (student.idIssueDate) {
    return formatDate(student.idIssueDate);
  }
  return "—";
}

function StudentIdRequestDetailContent({
  student,
  statusFilter,
  onIssueId,
  onClose,
}: {
  student: RequestedIdDetail;
  statusFilter: string;
  onIssueId?: (student: RequestedIdDetail) => void;
  onClose: () => void;
}) {
  const canIssue = showIssueButton(student, statusFilter) && onIssueId;

  return (
    <>
      <div className="space-y-3 py-2">
        <ProfileCard>
          <IdentityHeader
            name={student.name || "Unnamed student"}
            subtitle={
              student.rollNo ? `Roll ${student.rollNo}` : "Roll number not set"
            }
          />
          <ProfileCardSection icon={User} label="Identity" divider>
            <ContactPillGrid columns={2}>
              <ContactPill
                icon={CalendarDays}
                label="Born"
                value={
                  student.dateOfBirth
                    ? formatDate(student.dateOfBirth)
                    : "—"
                }
              />
              <ContactPill
                icon={IdCard}
                label="ID status"
                value={student.idIssued?.trim() || "—"}
              />
              <ContactPill
                icon={CalendarDays}
                label="Issue date"
                value={
                  student.idIssueDate
                    ? formatDate(student.idIssueDate)
                    : "—"
                }
              />
              <ContactPill
                icon={Building2}
                label="Franchise"
                value={
                  student.franchise?.name || student.franchiseName || "—"
                }
              />
            </ContactPillGrid>
          </ProfileCardSection>
          <ProfileCardSection icon={MapPin} label="Addresses" divider>
            <LabeledValue
              label="Residential address"
              value={student.residentialAddress || "—"}
            />
            <LabeledValue
              label="Franchise address"
              value={
                student.franchise?.address || student.franchiseeAddress || "—"
              }
              className="pt-2"
            />
          </ProfileCardSection>
          <ProfileCardSection icon={Phone} label="Parent contacts" divider>
            <ContactPillGrid columns={2}>
              <ContactPill
                icon={Phone}
                label="Father"
                value={student.fatherContactNo || "—"}
              />
              <ContactPill
                icon={Phone}
                label="Mother"
                value={student.motherContactNo || "—"}
              />
            </ContactPillGrid>
          </ProfileCardSection>
        </ProfileCard>
        {canIssue ? (
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                onIssueId(student);
                onClose();
              }}
            >
              Issue ID
            </Button>
          </div>
        ) : (
          <div className="flex justify-end border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export default function FranchiseIdDetails({
  franchiseId,
  franchiseName,
  onIssueSuccess,
}: FranchiseIdDetailsProps) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<RequestedIdDetail | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailStudent, setDetailStudent] =
    useState<RequestedIdDetail | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: searchTerm || undefined,
      status: statusFilter,
      sortBy: "id",
      sortOrder: "DESC" as const,
    }),
    [page, searchTerm, statusFilter],
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

  const handleIssueId = (student: RequestedIdDetail) => {
    setSelectedStudent(student);
    setPreviewOpen(true);
  };

  const columns: DataTableColumn<RequestedIdDetail>[] = [
    {
      key: "student",
      header: "Student",
    },
    {
      key: "dob",
      header: "DOB",
      className: "text-center",
      render: (student) =>
        student.dateOfBirth
          ? formatDate(student.dateOfBirth)
          : "—",
    },
    {
      key: "issueDate",
      header: "Issue date",
      className: "text-center",
      render: (student) => formatIssueDate(student),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (student) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="View student details"
          aria-label="View student details"
          onClick={() => setDetailStudent(student)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "Requested", label: "Requested" },
        { value: "Issued", label: "Issued" },
      ],
      defaultValue: "all",
    },
  ];

  const toolbarActions = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Request date:</span>
      <DateInput
        value={dateFilter}
        onChange={(v) => {
          setDateFilter(v);
          setPage(1);
        }}
        className="h-9 w-[170px]"
      />
      <Button
        size="sm"
        variant="default"
        className="h-9 shrink-0"
        onClick={() => setDispatchOpen(true)}
        disabled={pendingIdDispatchItems.length === 0}
      >
        Dispatch ID cards
      </Button>
    </div>
  );

  return (
    <ExpandedDetailSurface className="border-t border-border/60">
      <ExpandedDetailSection title="Students">
        {!franchiseId?.trim() ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No franchise selected.
              </p>
            ) : (
              <DataTable
                data={students}
                loading={loading}
                columns={columns}
                getRowId={(student) =>
                  student.id != null
                    ? `id-${student.id}`
                    : `${student.name}-${student.rollNo}-${student.dateOfBirth ?? ""}`
                }
                renderMainCell={(student) => (
                  <TableMainCell
                    title={student.name}
                    subtitle={
                      student.rollNo
                        ? formatEntityCodeForDisplay(student.rollNo)
                        : undefined
                    }
                  />
                )}
                searchPlaceholder="Search by name, roll number, or franchise..."
                onSearchChange={(value) => {
                  setSearchTerm(value);
                  setPage(1);
                }}
                filters={filters}
                onFilterChange={(key, value) => {
                  if (key === "status") setStatusFilter(value as string);
                  setPage(1);
                }}
                toolbarActions={toolbarActions}
                pagination={{ total: totalStudents, totalPages }}
                currentPage={page}
                onPageChange={setPage}
                itemsPerPage={limit}
                emptyMessage="No students found for this filter"
                resultsText={(count, total) =>
                  `Showing ${count} of ${total} students`
                }
              />
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

      <DetailDialog
        open={detailStudent != null}
        onOpenChange={(open) => {
          if (!open) setDetailStudent(null);
        }}
        size="md"
        title="Student details"
        description="Full information for this ID request"
      >
        {detailStudent ? (
          <StudentIdRequestDetailContent
            student={detailStudent}
            statusFilter={statusFilter}
            onIssueId={handleIssueId}
            onClose={() => setDetailStudent(null)}
          />
        ) : null}
      </DetailDialog>

      <BulkDispatchPickerModal
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        title="ID cards"
        items={pendingIdDispatchItems}
        eligibleOrders={eligibleQuery.data ?? []}
        isLoadingOrders={eligibleQuery.isLoading}
        onConfirm={async (selectedIds, orderId) => {
          const result = await bulkDispatchIds.mutateAsync({
            studentIds: selectedIds,
            orderId: orderId ?? undefined,
          });
          const failed = result?.failed ?? [];
          const succeeded = result?.succeeded ?? [];
          if (failed.length > 0 && succeeded.length === 0) {
            toast.error(
              `None of the ID cards could be dispatched: ${failed[0].error}`,
            );
          } else if (failed.length > 0) {
            toast.warning(
              `${failed.length} ID card${failed.length === 1 ? "" : "s"} failed (${failed[0].error}); dispatched the rest.`,
            );
          }
          await detailsQuery.refetch();
          onIssueSuccess?.();
        }}
      />
    </ExpandedDetailSurface>
  );
}
