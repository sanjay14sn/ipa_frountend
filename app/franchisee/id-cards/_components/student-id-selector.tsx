"use client";

import React, { useState, useMemo } from "react";
import { Search, User as UserIcon, CheckCircle2, Filter, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getStudentLevelName } from "@/components/students/student-helpers";
import { uploadedFileSrc } from "@/lib/uploads";
import type { StudentData } from "@/services/student-list.service";

interface StudentIdSelectorProps {
  students: StudentData[];
  selectedStudent: StudentData | null;
  onSelectStudent: (student: StudentData) => void;
  isLoading?: boolean;
  selectedIds: number[];
  onToggleSelectId: (id: number) => void;
  onSelectAll: (ids: number[]) => void;
  onClearSelected: () => void;
  onBatchPrint: () => void;
}

export function StudentIdSelector({
  students,
  selectedStudent,
  onSelectStudent,
  isLoading = false,
  selectedIds,
  onToggleSelectId,
  onSelectAll,
  onClearSelected,
  onBatchPrint,
}: StudentIdSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  // Get distinct levels for filtering
  const distinctLevels = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const lvl = getStudentLevelName(s);
      if (lvl && lvl !== "N/A") set.add(lvl);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(q));

      const lvl = getStudentLevelName(s);
      const matchesLevel = levelFilter === "all" || lvl === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [students, searchQuery, levelFilter]);

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.includes(s.id));

  const handleSelectAllToggle = () => {
    if (allFilteredSelected) {
      onClearSelected();
    } else {
      onSelectAll(filteredStudents.map((s) => s.id));
    }
  };

  return (
    <Card className="border-border/80 shadow-md flex flex-col h-[680px]">
      <CardHeader className="border-b bg-muted/20 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Students Directory</CardTitle>
            <CardDescription className="text-xs">
              {students.length} students enrolled in this centre
            </CardDescription>
          </div>
          {selectedIds.length > 0 && (
            <Button
              onClick={onBatchPrint}
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Batch Print ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by student name or roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          {distinctLevels.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                aria-label="Filter by level"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="h-9 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Levels</option>
                {distinctLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Multi-Select Header */}
        <div className="flex items-center justify-between pt-1 px-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allFilteredSelected}
              onCheckedChange={handleSelectAllToggle}
            />
            <label htmlFor="select-all" className="cursor-pointer font-medium select-none">
              Select All ({filteredStudents.length})
            </label>
          </div>
          {selectedIds.length > 0 && (
            <span className="text-[11px] text-emerald-700 font-semibold">
              {selectedIds.length} selected
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto divide-y divide-border/60">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No students found matching your search.
          </div>
        ) : (
          filteredStudents.map((s) => {
            const isSelected = selectedStudent?.id === s.id;
            const isChecked = selectedIds.includes(s.id);
            const level = getStudentLevelName(s);
            const photoSrc = s.photoPath ? uploadedFileSrc(s.photoPath) : null;

            return (
              <div
                key={s.id}
                onClick={() => onSelectStudent(s)}
                className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? "bg-emerald-50/80 border-l-4 border-l-emerald-600"
                    : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Multi-select checkbox */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectId(s.id);
                    }}
                    className="p-1"
                  >
                    <Checkbox checked={isChecked} />
                  </div>

                  {/* Student Thumbnail */}
                  <div className="h-10 w-10 rounded-lg overflow-hidden border border-border/80 bg-slate-100 flex-shrink-0 flex items-center justify-center">
                    {photoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoSrc}
                        alt={s.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-emerald-900/60 uppercase">
                        {s.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                    )}
                  </div>

                  {/* Student Info */}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {s.name}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      {s.rollNo || "No Roll No"}
                    </p>
                    {level && level !== "N/A" && (
                      <span className="inline-block mt-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {level}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Badge / Status */}
                <div className="flex-shrink-0">
                  {isSelected ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] px-2 py-0.5 text-white">
                      Selected
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                    >
                      Preview
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
