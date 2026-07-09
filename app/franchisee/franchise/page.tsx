"use client";

import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { ProgramsSection } from "./components/programs-section";
import { MyAgreementsSection } from "./components/my-agreements-section";
import { CIAgreementsSection } from "./components/ci-agreements-section";

const TABS = ["programs", "agreements", "ci-agreements"] as const;

function FranchiseeFranchiseHubInner() {
  const [tab, setTab] = useTabFromUrl("programs", TABS);

  return (
    <PageTabs
      title="Franchise"
      description="Manage program requests, signed agreements, and CI agreements for your centre."
      tabs={[
        { value: "programs", label: "Programs" },
        { value: "agreements", label: "My Agreements" },
        { value: "ci-agreements", label: "CI Agreements" },
      ]}
      value={tab}
      onValueChange={setTab}
    >
      <TabsContent value="programs" className="mt-0">
        <ProgramsSection />
      </TabsContent>
      <TabsContent value="agreements" className="mt-0">
        <MyAgreementsSection />
      </TabsContent>
      <TabsContent value="ci-agreements" className="mt-0">
        <CIAgreementsSection />
      </TabsContent>
    </PageTabs>
  );
}

export default function FranchiseeFranchiseHubPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FranchiseeFranchiseHubInner />
    </Suspense>
  );
}
