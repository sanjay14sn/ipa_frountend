"use client";

import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { CiApprovalsSection } from "../course-instructor-approvals/ci-approvals-section";
import { CiTrainingSection } from "./ci-training-section";
import ActiveCourseInstructorsTable from "../course-instructor-approvals/components/ActiveCourseInstructorsTable";
import { TablePageShell } from "@/components/shared";

const TABS = ["applications", "active", "training"] as const;

function AdminCourseInstructorsHubInner() {
  const [tab, setTab] = useTabFromUrl("applications", TABS);

  return (
    <TablePageShell
      title="Course instructors"
      description="Applications, training sessions, and curriculum levels."
    >
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="active">Active CIs</TabsTrigger>
          <TabsTrigger value="training">CI training</TabsTrigger>
        </TabsList>
        <TabsContent value="applications" className="mt-4">
          <CiApprovalsSection />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <ActiveCourseInstructorsTable />
        </TabsContent>
        <TabsContent value="training" className="mt-4">
          <CiTrainingSection />
        </TabsContent>
      </Tabs>
    </TablePageShell>
  );
}

export default function AdminCourseInstructorsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      }
    >
      <AdminCourseInstructorsHubInner />
    </Suspense>
  );
}
