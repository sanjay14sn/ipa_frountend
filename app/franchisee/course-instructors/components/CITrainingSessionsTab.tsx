"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Users } from "lucide-react";
import { DataTable } from "@/components/shared";
import type { DataTableColumn, DataTableSortOption } from "@/components/shared";
import { usePrograms } from "@/hooks/api/program.hooks";
import { useTrainingLevelsForProgram } from "@/hooks/api/training-level.hooks";
import { useFranchiseeTrainingSessions } from "@/hooks/api/course-instructor.hooks";
import type { FranchiseeTrainingSession } from "@/services/ci-training-franchisee.service";
import BulkAssignCIModal from "./BulkAssignCIModal";

export default function CITrainingSessionsTab() {
  const [programId, setProgramId] = useState<number | undefined>();
  const [trainingLevelId, setTrainingLevelId] = useState<number | undefined>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<FranchiseeTrainingSession | null>(null);
  const itemsPerPage = 10;

  const { programs } = usePrograms();
  const { data: trainingLevels } = useTrainingLevelsForProgram(programId);

  const { sessions, isLoading } = useFranchiseeTrainingSessions({
    trainingLevelId,
    programId: !trainingLevelId ? programId : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const cmp = a.sessionDate.localeCompare(b.sessionDate);
      return sortOrder === "ASC" ? cmp : -cmp;
    });
  }, [sessions, sortOrder]);

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedSessions.slice(start, start + itemsPerPage);
  }, [sortedSessions, currentPage]);

  const totalPages = Math.ceil(sortedSessions.length / itemsPerPage);

  function handleProgramChange(value: string) {
    const id = value === "all" ? undefined : Number(value);
    setProgramId(id);
    setTrainingLevelId(undefined);
    setCurrentPage(1);
  }

  function handleLevelChange(value: string) {
    setTrainingLevelId(value === "all" ? undefined : Number(value));
    setCurrentPage(1);
  }

  const columns: DataTableColumn<FranchiseeTrainingSession>[] = [
    {
      key: "sessionDate",
      header: "Session Date",
      className: "w-[140px]",
      render: (s) => (
        <div className="flex items-center gap-1 text-sm text-card-foreground">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {new Date(s.sessionDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
      ),
    },
    {
      key: "trainingLevel",
      header: "Training Level",
      className: "w-[160px]",
      render: (s) => (
        <span className="text-sm text-card-foreground">
          {s.trainingLevelName ?? `Level ${s.trainingLevelId}`}
        </span>
      ),
    },
    {
      key: "region",
      header: "Region",
      className: "w-[120px]",
      render: (s) => (
        <span className="text-sm text-muted-foreground capitalize">{s.region}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[110px]",
      render: (s) =>
        s.status === "COMPLETED" ? (
          <Badge className="bg-green-50 text-green-700 border border-green-200">
            Completed
          </Badge>
        ) : (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
            Open
          </Badge>
        ),
    },
    {
      key: "action",
      header: "Action",
      className: "w-[140px]",
      render: (s) => (
        <Button
          size="sm"
          variant="outline"
          disabled={s.status === "COMPLETED"}
          onClick={() => setSelectedSession(s)}
          className="gap-1"
        >
          <Users className="w-3 h-3" />
          Bulk Assign
        </Button>
      ),
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { label: "Date (Ascending)", value: "date-asc" },
    { label: "Date (Descending)", value: "date-desc" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground font-medium">Program</label>
          <Select onValueChange={handleProgramChange} value={programId?.toString() ?? "all"}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground font-medium">
            Training Level
          </label>
          <Select
            onValueChange={handleLevelChange}
            value={trainingLevelId?.toString() ?? "all"}
            disabled={!programId}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={programId ? "All levels" : "Select program first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {(trainingLevels ?? []).map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">From</label>
          <Input
            type="date"
            className="h-9 w-[140px]"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">To</label>
          <Input
            type="date"
            className="h-9 w-[140px]"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <DataTable
        data={paginatedSessions}
        columns={columns}
        getRowId={(s) => String(s.id)}
        renderMainCell={(s) => (
          <div>
            <div className="font-medium text-card-foreground">
              {s.trainingLevelName ?? `Level ${s.trainingLevelId}`}
            </div>
            <div className="text-xs text-muted-foreground capitalize">{s.region}</div>
          </div>
        )}
        sortOptions={sortOptions}
        defaultSortBy="date-asc"
        defaultSortOrder="ASC"
        onSortChange={(by) => {
          setSortOrder(by === "date-desc" ? "DESC" : "ASC");
          setCurrentPage(1);
        }}
        pagination={{ total: sortedSessions.length, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        loading={isLoading}
        emptyMessage="No open training sessions found in your region."
      />

      <BulkAssignCIModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </div>
  );
}
