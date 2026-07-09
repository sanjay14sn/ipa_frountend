"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { WaitingInstructor, listWaiting } from "@/services/ci-training-admin.service";
import { getAllPrograms, Program } from "@/services/program.service";
import {
  getTrainingLevelsByProgram,
  TrainingLevel,
} from "@/services/training-level.service";
import { DataTable, type DataTableColumn, TableMainCell } from "@/components/shared";
import { formatStateLabel, getApiErrorMessage, stateNames } from "./ci-training-utils";

export function WaitingTab() {
  const queryClient = useQueryClient();
  const [regionFilter, setRegionFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [trainingLevelFilter, setTrainingLevelFilter] = useState("");
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);
  const [search, setSearch] = useState("");
  const programs =
    queryClient.getQueryData<Program[]>(["ci-training-programs"]) ?? [];

  const loadPrograms = async () => {
    if (loadingPrograms) return;
    setLoadingPrograms(true);
    try {
      await queryClient.fetchQuery({
        queryKey: ["ci-training-programs"],
        queryFn: () => getAllPrograms(),
        staleTime: Infinity,
        gcTime: Infinity,
      });
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to load programs."));
    } finally {
      setLoadingPrograms(false);
    }
  };

  const loadLevelsForProgram = async (selectedProgramId: number) => {
    if (!selectedProgramId || loadingLevels) return;
    setLoadingLevels(true);
    try {
      const rows = await queryClient.fetchQuery({
        queryKey: ["ci-training-level-options", selectedProgramId],
        queryFn: () => getTrainingLevelsByProgram(selectedProgramId),
        staleTime: Infinity,
        gcTime: Infinity,
      });
      setTrainingLevels(rows.filter((level) => level.isActive));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to load training levels."));
    } finally {
      setLoadingLevels(false);
    }
  };

  const { data: waiting = [], isLoading } = useQuery({
    queryKey: [
      "ci-training-waiting",
      regionFilter,
      trainingLevelFilter,
      search,
    ],
    queryFn: () =>
      listWaiting({
        region: regionFilter || undefined,
        trainingLevelId: trainingLevelFilter
          ? Number(trainingLevelFilter)
          : undefined,
        search: search.trim() || undefined,
      }),
    staleTime: 30_000,
  });

  const columns = useMemo<DataTableColumn<WaitingInstructor>[]>(
    () => [
      { key: "code", header: "Code", render: (w) => w.instructorCode ?? "—" },
      {
        key: "franchise",
        header: "Franchise",
        render: (w) => w.franchiseName ?? "—",
      },
      {
        key: "region",
        header: "State",
        render: (w) => formatStateLabel(w.region),
      },
      {
        key: "trainingLevel",
        header: "Training Level",
        render: (w) => `Level ${w.trainingLevelId}`,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={regionFilter || "all"}
          onValueChange={(value) =>
            setRegionFilter(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Filter by state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {stateNames.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={programFilter || "all"}
          onValueChange={(value) => {
            setProgramFilter(value === "all" ? "" : value);
            setTrainingLevelFilter("");
            setTrainingLevels([]);
          }}
          onOpenChange={(open) => {
            if (open) void loadPrograms();
          }}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue
              placeholder={
                loadingPrograms ? "Loading programs..." : "Filter by program"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={String(program.id)}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={trainingLevelFilter || "all"}
          onValueChange={(value) =>
            setTrainingLevelFilter(value === "all" ? "" : value)
          }
          onOpenChange={(open) => {
            if (open && programFilter) {
              void loadLevelsForProgram(Number(programFilter));
            }
          }}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue
              placeholder={
                !programFilter
                  ? "Filter by training level"
                  : loadingLevels
                    ? "Loading training levels..."
                    : "Filter by training level"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All training levels</SelectItem>
            {trainingLevels.map((level) => (
              <SelectItem key={level.id} value={String(level.id)}>
                {level.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable<WaitingInstructor>
        data={waiting}
        loading={isLoading}
        columns={columns}
        getRowId={(w) => `${w.instructorId}-${w.trainingLevelId}-${w.region}`}
        renderMainCell={(w) => (
          <TableMainCell
            title={w.instructorName ?? `CI-${w.instructorId}`}
            subtitle={`${w.instructorCode ?? "—"} - ${formatStateLabel(w.region)}`}
          />
        )}
        searchPlaceholder="Search instructor, code, franchise or state..."
        onSearchChange={setSearch}
        emptyMessage="No instructors waiting"
      />
    </div>
  );
}
