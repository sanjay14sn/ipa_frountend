"use client";

import { Suspense } from "react";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { IdRequestsSection } from "./components/id-requests-section";
import { CertificateRequestsSection } from "./components/certificate-requests-section";
import { StudentLifecycleSection } from "./components/student-lifecycle-section";
import { PageSkeleton } from "@/components/shared";

const TABS = ["ids", "certificates", "lifecycle"] as const;

function AdminStudentsHubInner() {
  const [tab, setTab] = useTabFromUrl("ids", TABS);

  return (
    <PageTabs
      title="Students"
      description="ID cards, certificates, and student-related admin workflows."
      tabs={[
        { value: "ids", label: "ID requests" },
        { value: "certificates", label: "Certificate requests" },
        { value: "lifecycle", label: "Lifecycle" },
      ]}
      value={tab}
      onValueChange={setTab}
    >
      <TabsContent value="ids" className="mt-0">
        <IdRequestsSection />
      </TabsContent>
      <TabsContent value="certificates" className="mt-0">
        <CertificateRequestsSection />
      </TabsContent>
      <TabsContent value="lifecycle" className="mt-0">
        <StudentLifecycleSection />
      </TabsContent>
    </PageTabs>
  );
}

export default function AdminStudentsHubPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminStudentsHubInner />
    </Suspense>
  );
}
