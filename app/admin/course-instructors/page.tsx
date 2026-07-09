"use client";

import { Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { CiApprovalsSection } from "./_components/approvals/ci-approvals-section";
import { CiTrainingSection } from "./ci-training-section";
import ActiveCourseInstructorsTable from "./_components/approvals/ActiveCourseInstructorsTable";
import SetupExistingCIDialog from "./_components/approvals/SetupExistingCIDialog";
import { TablePageShell, PageSkeleton } from "@/components/shared";

const TABS = ["applications", "active", "training"] as const;

function AdminCourseInstructorsHubInner() {
  const [tab, setTab] = useTabFromUrl("applications", TABS);
  const [setupOpen, setSetupOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleSetupSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["course-instructors", "admin", "summary"] });
    queryClient.invalidateQueries({ queryKey: ["course-instructors", "admin", "details"] });
    queryClient.invalidateQueries({ queryKey: ["course-instructors", "admin", "status"] });
  };

  return (
    <TablePageShell
      title="Course instructors"
      description="Applications, training sessions, and curriculum levels."
      actions={
        <Button onClick={() => setSetupOpen(true)} variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Setup Existing CI
        </Button>
      }
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

      <SetupExistingCIDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSuccess={handleSetupSuccess}
      />
    </TablePageShell>
  );
}

export default function AdminCourseInstructorsHubPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton />
      }
    >
      <AdminCourseInstructorsHubInner />
    </Suspense>
  );
}
