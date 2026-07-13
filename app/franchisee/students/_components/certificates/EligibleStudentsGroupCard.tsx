"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, ChevronDown, ChevronUp } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { EligibleStudent } from "@/services/student.service";

/**
 * Returns true when "now" is at least 15 days past the level's duration end.
 * Anchor is `lastCertIssuedAt` (the previous certificate's issue date for the
 * current-level clock). Returns false if either input is missing.
 */
function isPastDurationPlusFifteenDays(
  lastCertIssuedAt: string | null,
  durationInMonths: number
): boolean {
  if (!lastCertIssuedAt || !durationInMonths) return false;
  const start = new Date(lastCertIssuedAt);
  if (Number.isNaN(start.getTime())) return false;
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationInMonths);
  end.setDate(end.getDate() + 15);
  return Date.now() >= end.getTime();
}

interface EligibleStudentsGroupCardProps {
  groupKey: string;
  stream: string;
  levelName: string;
  students: EligibleStudent[];
  selectedStudents: Set<number>;
  onSelectStudent: (id: number, checked: boolean) => void;
  onSelectAllInGroup: (groupKey: string, checked: boolean) => void;
  onRequestCertificate?: (student: EligibleStudent) => void;
  defaultOpen?: boolean;
}

export default function EligibleStudentsGroupCard({
  groupKey,
  stream,
  levelName,
  students,
  selectedStudents,
  onSelectStudent,
  onSelectAllInGroup,
  onRequestCertificate,
  defaultOpen = true,
}: EligibleStudentsGroupCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const allInGroupSelected =
    students.length > 0 && students.every((s) => selectedStudents.has(s.id));
  const someInGroupSelected = students.some((s) => selectedStudents.has(s.id));

  const handleSelectAllChange = (checked: boolean | "indeterminate") => {
    onSelectAllInGroup(groupKey, checked === true);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: checkbox + group label + count badge */}
          <div className="flex items-center gap-3 min-w-0">
            <Checkbox
              checked={allInGroupSelected ? true : someInGroupSelected ? "indeterminate" : false}
              onCheckedChange={handleSelectAllChange}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
              aria-label={`Select all students in ${stream} ${levelName}`}
            />
            <span className="font-semibold text-sm text-foreground truncate">
              {stream} &middot; {levelName}
            </span>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {students.length} {students.length === 1 ? "student" : "students"}
            </Badge>
          </div>
          {/* Right: chevron toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? "Collapse group" : "Expand group"}
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="p-0">
          <div className="border-t divide-y">
            {students.map((student) => {
              const isSelected = selectedStudents.has(student.id);

              let eligibilityBadge: React.ReactNode;
              if (student.eligibilityReason === "no_certificate") {
                eligibilityBadge = (
                  <StatusBadge tone="info" label="First certificate" />
                );
              } else {
                const exceeded = isPastDurationPlusFifteenDays(
                  student.lastCertIssuedAt,
                  student.durationInMonths
                );
                eligibilityBadge = exceeded ? (
                  <StatusBadge tone="warning" label="Duration exceeded" />
                ) : (
                  <StatusBadge tone="success" label="Eligible" />
                );
              }

              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
                >
                  {/* Left: checkbox + name + roll */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        onSelectStudent(student.id, checked === true)
                      }
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                      aria-label={`Select ${student.name}`}
                    />
                    <span className="text-sm font-medium text-foreground truncate">
                      {student.name}
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        &middot; {student.rollNo}
                      </span>
                    </span>
                  </div>

                  {/* Right: eligibility badge + request button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {eligibilityBadge}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Request Certificate"
                      aria-label={`Request certificate for ${student.name}`}
                      onClick={() => onRequestCertificate?.(student)}
                    >
                      <Award className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
