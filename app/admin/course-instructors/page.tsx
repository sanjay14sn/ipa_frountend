"use client";

import { Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { CiApprovalsSection } from "./_components/approvals/ci-approvals-section";
import { CiTrainingSection } from "./ci-training-section";
import { CiAgreementsSection } from "./_components/ci-agreements-section";
import ActiveCourseInstructorsTable from "./_components/approvals/ActiveCourseInstructorsTable";
import SetupExistingCIDialog from "./_components/approvals/SetupExistingCIDialog";
import { PageSkeleton } from "@/components/shared";

const TABS = ["applications", "active", "training", "agreements"] as const;

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
    <PageTabs
      title="Course instructors"
      description="Applications, training sessions, and curriculum levels."
      action={
        <Button onClick={() => setSetupOpen(true)} variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Setup Existing CI
        </Button>
      }
      tabs={[
        { value: "applications", label: "Applications" },
        { value: "active", label: "Active CIs" },
        { value: "training", label: "CI training" },
        { value: "agreements", label: "Agreements" },
      ]}
      value={tab}
      onValueChange={setTab}
    >
      <TabsContent value="applications" className="mt-0">
        <CiApprovalsSection />
      </TabsContent>
      <TabsContent value="active" className="mt-0">
        <ActiveCourseInstructorsTable />
      </TabsContent>
      <TabsContent value="training" className="mt-0">
        <CiTrainingSection />
      </TabsContent>

      <TabsContent value="agreements" className="mt-0">
        <CiAgreementsSection />
      </TabsContent>

      <SetupExistingCIDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSuccess={handleSetupSuccess}
      />
    </PageTabs>
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
