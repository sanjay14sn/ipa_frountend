"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FranchiseeCertificate } from "@/services/student.service";
import FranchiseeCertificatesGroupCard from "./FranchiseeCertificatesGroupCard";

interface FranchiseeCertificatesGroupedViewProps {
  certificates?: FranchiseeCertificate[];
  onRefresh?: () => void;
}

interface GroupEntry {
  key: string;
  stream: string;
  levelName: string;
  certificates: FranchiseeCertificate[];
}

type SortOption = "requestDate" | "studentName" | "marks";

export default function FranchiseeCertificatesGroupedView({
  certificates,
}: FranchiseeCertificatesGroupedViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("requestDate");

  // Derive unique filter options from the full unfiltered list
  const uniqueStreams = useMemo(
    () =>
      [
        ...new Set(
          (certificates ?? []).map((c) => c.studentStream).filter(Boolean)
        ),
      ].sort(),
    [certificates]
  );

  const uniqueLevels = useMemo(
    () =>
      [
        ...new Set(
          (certificates ?? []).map((c) => c.studentLevel).filter(Boolean)
        ),
      ].sort(),
    [certificates]
  );

  // Apply filters then sort
  const filteredAndSorted = useMemo(() => {
    const list = certificates ?? [];
    const term = searchTerm.toLowerCase();

    const filtered = list.filter((c) => {
      const matchesSearch =
        !term ||
        c.studentName.toLowerCase().includes(term) ||
        c.studentRollNo.toLowerCase().includes(term) ||
        c.instructorName.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || c.status === statusFilter;

      const matchesStream =
        streamFilter === "all" || c.studentStream === streamFilter;

      const matchesLevel =
        levelFilter === "all" || c.studentLevel === levelFilter;

      return matchesSearch && matchesStatus && matchesStream && matchesLevel;
    });

    // Sort within the flat list before grouping
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "requestDate":
          return (
            new Date(b.requestDate).getTime() -
            new Date(a.requestDate).getTime()
          );
        case "studentName":
          return a.studentName.localeCompare(b.studentName);
        case "marks": {
          const aDenom = a.totalMarks || a.levelTotalMarks || 1;
          const bDenom = b.totalMarks || b.levelTotalMarks || 1;
          return (
            b.marksObtained / bDenom - a.marksObtained / aDenom
          );
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [certificates, searchTerm, statusFilter, streamFilter, levelFilter, sortBy]);

  // Group by stream + level
  const groups = useMemo<GroupEntry[]>(() => {
    const map = new Map<string, GroupEntry>();
    for (const cert of filteredAndSorted) {
      const key = `${cert.studentStream}__${cert.studentLevel}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          stream: cert.studentStream,
          levelName: cert.studentLevel,
          certificates: [],
        });
      }
      map.get(key)!.certificates.push(cert);
    }
    // Sort groups alphabetically by stream then level
    return [...map.values()].sort((a, b) => {
      const streamCmp = a.stream.localeCompare(b.stream);
      if (streamCmp !== 0) return streamCmp;
      return a.levelName.localeCompare(b.levelName);
    });
  }, [filteredAndSorted]);

  return (
    <div className="space-y-4">
      {/* Global filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by student name, roll number, or instructor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 w-72 text-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Issued">Issued</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
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
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortOption)}
        >
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="requestDate">Request Date (newest)</SelectItem>
            <SelectItem value="studentName">Student Name (A–Z)</SelectItem>
            <SelectItem value="marks">Marks % (highest)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Group cards */}
      {groups.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          No certificates found matching your criteria
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <FranchiseeCertificatesGroupCard
              key={group.key}
              stream={group.stream}
              levelName={group.levelName}
              certificates={group.certificates}
            />
          ))}
        </div>
      )}
    </div>
  );
}
