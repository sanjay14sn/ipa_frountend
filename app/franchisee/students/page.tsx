"use client";

import { Suspense } from "react";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { StudentsManageSection } from "./students-manage-section";
import { FranchiseeCertificateRequestsSection } from "./_components/certificate-requests-section";
import { PageSkeleton } from "@/components/shared";

const TABS = ["manage", "certificates"] as const;

function FranchiseeStudentsHubInner() {
  const [tab, setTab] = useTabFromUrl("manage", TABS);

  return (
    <PageTabs
      title="Students"
      description="Enrolment and certificates."
      tabs={[
        { value: "manage", label: "Manage students" },
        { value: "certificates", label: "Certificate requests" },
      ]}
      value={tab}
      onValueChange={setTab}
    >
      <TabsContent value="manage" className="mt-0">
        <StudentsManageSection />
      </TabsContent>
      <TabsContent value="certificates" className="mt-0">
        <FranchiseeCertificateRequestsSection />
      </TabsContent>
    </PageTabs>
  );
}

export default function FranchiseeStudentsHubPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton />
      }
    >
      <FranchiseeStudentsHubInner />
    </Suspense>
  );
}
