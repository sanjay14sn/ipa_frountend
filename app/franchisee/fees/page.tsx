"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { PageHeaderCard } from "@/components/shared/page-header-card";
import { PageSkeleton } from "@/components/shared/skeletons";
import { useUser } from "@/context/user-context";
import { useStudents } from "@/hooks/api/student.hooks";
import type { StudentData } from "@/services/student-list.service";
import { StudentFeeSelector } from "./_components/student-fee-selector";
import { FeeConfigurationForm } from "./_components/fee-configuration-form";

function FeesPageContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");

  const { students, isLoading } = useStudents({
    status: "active",
  });

  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);

  // Auto-select student ONLY if query param studentId is provided
  useEffect(() => {
    if (students && students.length > 0 && studentIdParam) {
      const found = students.find((s) => String(s.id) === studentIdParam);
      if (found) {
        setSelectedStudent(found);
      }
    }
  }, [students, studentIdParam]);

  if (!user || !user.franchiseId) {
    return <PageSkeleton />;
  }

  return (
    <div className="w-full space-y-6">
      {/* PAGE HEADER */}
      <PageHeaderCard
        title="Student Fee Setup & Configuration"
        description="Configure fee rules, level fees, and course timelines for enrolled students."
      />

      {/* STUDENT SELECTOR SECTION */}
      <StudentFeeSelector
        students={students}
        selectedStudent={selectedStudent}
        onSelectStudent={setSelectedStudent}
        isLoading={isLoading}
      />

      {/* FEE CONFIGURATION FORM */}
      {selectedStudent ? (
        <FeeConfigurationForm key={selectedStudent.id} student={selectedStudent} />
      ) : (
        !isLoading && (!students || students.length === 0) && (
          <div className="rounded-xl border border-border/80 bg-muted/20 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h3 className="mt-3 text-base font-semibold text-foreground">
              No Registered Students Available
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              There are no active enrolled students registered under your franchise yet. Please enroll a student under Students to configure fees.
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default function FranchiseeFeesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FeesPageContent />
    </Suspense>
  );
}
