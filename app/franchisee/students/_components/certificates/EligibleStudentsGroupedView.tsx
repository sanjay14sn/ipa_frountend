"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award } from "lucide-react";
import { EligibleStudent } from "@/services/student.service";
import EligibleStudentsGroupCard from "./EligibleStudentsGroupCard";

interface GroupEntry {
  key: string;
  stream: string;
  levelName: string;
  levelId: number;
  programId: number;
  students: EligibleStudent[];
}

interface EligibleStudentsGroupedViewProps {
  students?: EligibleStudent[];
  onRequestCertificate?: (student: EligibleStudent) => void;
  onBulkRequest?: (groups: GroupEntry[]) => void;
}

export default function EligibleStudentsGroupedView({
  students,
  onRequestCertificate,
  onBulkRequest,
}: EligibleStudentsGroupedViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(
    new Set()
  );

  // Unique filter options derived from the full student list (unfiltered)
  const uniqueStreams = useMemo(
    () => [...new Set((students ?? []).map((s) => s.stream).filter(Boolean))].sort(),
    [students]
  );
  const uniqueLevels = useMemo(
    () =>
      [...new Set((students ?? []).map((s) => s.levelName).filter(Boolean))].sort(),
    [students]
  );

  // Apply filters
  const filteredStudents = useMemo(() => {
    const list = students ?? [];
    return list.filter((s) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.rollNo.toLowerCase().includes(term);

      const matchesStream = streamFilter === "all" || s.stream === streamFilter;
      const matchesLevel = levelFilter === "all" || s.levelName === levelFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.status === "active") ||
        (statusFilter === "inactive" && s.status !== "active");

      return matchesSearch && matchesStream && matchesLevel && matchesStatus;
    });
  }, [students, searchTerm, streamFilter, levelFilter, statusFilter]);

  // Group filtered students by (stream, levelName, levelId, programId)
  const groups = useMemo<GroupEntry[]>(() => {
    const map = new Map<string, GroupEntry>();
    for (const student of filteredStudents) {
      const key = `${student.stream}__${student.levelName}__${student.levelId}__${student.programId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          stream: student.stream,
          levelName: student.levelName,
          levelId: student.levelId,
          programId: student.programId,
          students: [],
        });
      }
      map.get(key)!.students.push(student);
    }
    // Sort groups alphabetically by stream then levelName
    return [...map.values()].sort((a, b) => {
      const streamCmp = a.stream.localeCompare(b.stream);
      if (streamCmp !== 0) return streamCmp;
      return a.levelName.localeCompare(b.levelName);
    });
  }, [filteredStudents]);

  // Selection handlers
  const handleSelectStudent = (id: number, checked: boolean) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAllInGroup = (groupKey: string, checked: boolean) => {
    const group = groups.find((g) => g.key === groupKey);
    if (!group) return;
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      for (const s of group.students) {
        if (checked) {
          next.add(s.id);
        } else {
          next.delete(s.id);
        }
      }
      return next;
    });
  };

  const handleSubmitAll = () => {
    const payload = groups
      .filter((g) => g.students.some((s) => selectedStudents.has(s.id)))
      .map((g) => ({
        key: g.key,
        stream: g.stream,
        levelName: g.levelName,
        levelId: g.levelId,
        programId: g.programId,
        students: g.students.filter((s) => selectedStudents.has(s.id)),
      }));
    onBulkRequest?.(payload);
  };

  // Count of groups with at least one selected student
  const selectedGroupCount = groups.filter((g) =>
    g.students.some((s) => selectedStudents.has(s.id))
  ).length;

  return (
    <div className="relative space-y-4 pb-20">
      {/* Global filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or roll number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 w-64 text-sm"
        />
        <Select value={streamFilter} onValueChange={setStreamFilter}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Streams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Streams</SelectItem>
            {uniqueStreams.map((stream) => (
              <SelectItem key={stream} value={stream}>
                {stream}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {uniqueLevels.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Group cards */}
      {groups.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          No eligible students found matching your criteria
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <EligibleStudentsGroupCard
              key={group.key}
              groupKey={group.key}
              stream={group.stream}
              levelName={group.levelName}
              students={group.students}
              selectedStudents={selectedStudents}
              onSelectStudent={handleSelectStudent}
              onSelectAllInGroup={handleSelectAllInGroup}
              onRequestCertificate={onRequestCertificate}
              defaultOpen={true}
            />
          ))}
        </div>
      )}

      {/* Sticky bottom action bar */}
      {selectedStudents.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t bg-background px-6 py-3 shadow-lg">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selectedStudents.size}{" "}
              {selectedStudents.size === 1 ? "student" : "students"}
            </span>{" "}
            selected across{" "}
            <span className="font-semibold text-foreground">
              {selectedGroupCount}{" "}
              {selectedGroupCount === 1 ? "group" : "groups"}
            </span>
          </span>
          <Button
            onClick={handleSubmitAll}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Award className="mr-2 h-4 w-4" />
            Submit All
          </Button>
        </div>
      )}
    </div>
  );
}
