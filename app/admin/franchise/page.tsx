"use client";

import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { FranchiseManagementSection } from "./_components/franchise-management-section";
import { PendingApprovalsSection } from "./_components/pending-approvals-section";
import { ProgramRequestsSection } from "./_components/program-requests-section";
import { AdminAgreementsSection } from "./_components/admin-agreements-section";

const TABS = ["franchises", "applications", "programs", "agreements"] as const;

function AdminFranchiseHubInner() {
  const [tab, setTab] = useTabFromUrl("franchises", TABS);

  return (
    <PageTabs
      eyebrow="Management"
      title="Franchise Hub"
      description="Manage franchises, applications, program requests, and agreements."
      tabs={[
        { value: "franchises", label: "Franchises" },
        { value: "applications", label: "Applications" },
        { value: "programs", label: "Program requests" },
        { value: "agreements", label: "Agreements" },
      ]}
      value={tab}
      onValueChange={setTab}
    >
      <TabsContent value="franchises" className="mt-0">
        <FranchiseManagementSection />
      </TabsContent>
      <TabsContent value="applications" className="mt-0">
        <PendingApprovalsSection />
      </TabsContent>
      <TabsContent value="programs" className="mt-0">
        <ProgramRequestsSection />
      </TabsContent>
      <TabsContent value="agreements" className="mt-0">
        <AdminAgreementsSection embed />
      </TabsContent>
    </PageTabs>
  );
}

export default function AdminFranchiseHubPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminFranchiseHubInner />
    </Suspense>
  );
}
