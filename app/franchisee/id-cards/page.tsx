"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IdCard, Users, CheckCircle2, ShieldCheck } from "lucide-react";
import { PageHeaderCard } from "@/components/shared/page-header-card";
import { PageSkeleton } from "@/components/shared/skeletons";
import { useUser } from "@/context/user-context";
import { useStudents } from "@/hooks/api/student.hooks";
import type { StudentData } from "@/services/student-list.service";
import { IdCardPreview } from "./_components/id-card-preview";
import { StudentIdSelector } from "./_components/student-id-selector";
import { BatchPrintDialog } from "./_components/batch-print-dialog";

function FranchiseeIdCardsContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");

  const { students = [], isLoading } = useStudents({
    status: "active",
  });

  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);

  // Derive center name from user franchise profile
  const defaultCentreName = useMemo(() => {
    return (
      user?.franchiseName ||
      user?.franchises?.find((f) => f.id === user?.franchiseId)?.name ||
      user?.name ||
      "IPA Franchise Centre"
    );
  }, [user]);

  // Auto-select student if studentId in URL, or default to first student when loaded
  useEffect(() => {
    if (students && students.length > 0) {
      if (studentIdParam) {
        const match = students.find((s) => String(s.id) === studentIdParam);
        if (match) {
          setSelectedStudent(match);
          return;
        }
      }
      if (!selectedStudent) {
        setSelectedStudent(students[0]);
      }
    }
  }, [students, studentIdParam, selectedStudent]);

  // Multi-select handlers
  const handleToggleSelectId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (ids: number[]) => {
    setSelectedIds(ids);
  };

  const handleClearSelected = () => {
    setSelectedIds([]);
  };

  const batchPrintStudents = useMemo(() => {
    return students.filter((s) => selectedIds.includes(s.id));
  }, [students, selectedIds]);

  if (!user || !user.franchiseId) {
    return <PageSkeleton />;
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* PAGE HEADER */}
      <PageHeaderCard
        eyebrow="Student Identity"
        title={
          <div className="flex items-center gap-2.5">
            <IdCard className="h-6 w-6 text-emerald-600" />
            <span>Student ID Cards</span>
          </div>
        }
        description="Preview, customize, and generate official Ideal Play Abacus student ID cards with dynamic center branding."
      />

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Students</p>
            <p className="text-xl font-bold text-foreground">{students.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Centre Name</p>
            <p className="text-sm font-bold text-foreground truncate max-w-[200px]" title={defaultCentreName}>
              {defaultCentreName}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Selected for Batch</p>
            <p className="text-xl font-bold text-foreground">{selectedIds.length}</p>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: ID Card Live Preview & Actions (7 cols) */}
        <div className="lg:col-span-7">
          <IdCardPreview
            student={selectedStudent}
            defaultCentreName={defaultCentreName}
          />
        </div>

        {/* Right Column: Students Directory & Search (5 cols) */}
        <div className="lg:col-span-5">
          <StudentIdSelector
            students={students}
            selectedStudent={selectedStudent}
            onSelectStudent={setSelectedStudent}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onToggleSelectId={handleToggleSelectId}
            onSelectAll={handleSelectAll}
            onClearSelected={handleClearSelected}
            onBatchPrint={() => setIsBatchPrintOpen(true)}
          />
        </div>
      </div>

      {/* BATCH PRINT DIALOG */}
      <BatchPrintDialog
        open={isBatchPrintOpen}
        onOpenChange={setIsBatchPrintOpen}
        selectedStudents={batchPrintStudents}
        centreName={defaultCentreName}
      />
    </div>
  );
}

export default function FranchiseeIdCardsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FranchiseeIdCardsContent />
    </Suspense>
  );
}
