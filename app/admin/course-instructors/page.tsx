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
import { RejectedApplicationsSection } from "./_components/rejected-applications-section";
import ActiveCourseInstructorsTable from "./_components/approvals/ActiveCourseInstructorsTable";
import SetupExistingCIDialog from "./_components/approvals/SetupExistingCIDialog";
import { ADMIN_CI_STATUS_PREFIX } from "@/hooks/api/course-instructor.hooks";
import { PageSkeleton } from "@/components/shared";

const TABS = [
  "applications",
  "active",
  "training",
  "agreements",
  "rejected",
] as const;

function AdminCourseInstructorsHubInner() {
  const [tab, setTab] = useTabFromUrl("applications", TABS);
  const [setupOpen, setSetupOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleSetupSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [...ADMIN_CI_STATUS_PREFIX] });
    queryClient.invalidateQueries({ queryKey: ["ci-agreements", "admin"] });
  };

  return (
    <PageTabs
      title="Course instructors"
      description="Applications, training sessions, and curriculum levels."
      action={
        <Button
          onClick={() => setSetupOpen(true)}
          variant="outline"
          size="sm"
          title="Record an instructor who already teaches — distinct from approving a new application"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Onboard existing CI
        </Button>
      }
      tabs={[
        { value: "applications", label: "Applications" },
        { value: "active", label: "Active CIs" },
        { value: "training", label: "CI training" },
        { value: "agreements", label: "Agreements" },
        { value: "rejected", label: "Rejected" },
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

      <TabsContent value="rejected" className="mt-0">
        <RejectedApplicationsSection />
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
