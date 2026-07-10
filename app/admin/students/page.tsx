"use client";

import { Suspense } from "react";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { IdRequestsSection } from "./components/id-requests-section";
import { CertificateRequestsSection } from "./components/certificate-requests-section";
import { StudentLifecycleSection } from "./components/student-lifecycle-section";
import { RosterSection } from "./_components/roster-section";
import { PageSkeleton } from "@/components/shared";

// ADM-13: roster first and default; existing tab VALUES unchanged so every
// ?tab= deep link (and the /admin/id-requests redirect) keeps working.
const TABS = ["roster", "lifecycle", "ids", "certificates"] as const;

function AdminStudentsHubInner() {
  const [tab, setTab] = useTabFromUrl("roster", TABS);

  return (
    <PageTabs
      title="Students"
      description="Roster, lifecycle, ID cards, and certificates."
      tabs={[
        { value: "roster", label: "All students" },
        { value: "lifecycle", label: "Lifecycle" },
        { value: "ids", label: "ID requests" },
        { value: "certificates", label: "Certificate requests" },
      ]}
      value={tab}
      onValueChange={setTab}
    >
      <TabsContent value="roster" className="mt-0">
        <RosterSection />
      </TabsContent>
      <TabsContent value="lifecycle" className="mt-0">
        <StudentLifecycleSection />
      </TabsContent>
      <TabsContent value="ids" className="mt-0">
        <IdRequestsSection />
      </TabsContent>
      <TabsContent value="certificates" className="mt-0">
        <CertificateRequestsSection />
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
