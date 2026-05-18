"use client";

import { Suspense } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { ProgramsSection } from "./components/programs-section";
import { MyAgreementsSection } from "./components/my-agreements-section";
import { CIAgreementsSection } from "./components/ci-agreements-section";

const TABS = ["programs", "agreements", "ci-agreements"] as const;

function FranchiseeFranchiseHubInner() {
  const [tab, setTab] = useTabFromUrl("programs", TABS);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Franchise</h1>
        <p className="text-muted-foreground">
          Manage program requests, signed agreements, and CI agreements for your centre.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="agreements">My Agreements</TabsTrigger>
          <TabsTrigger value="ci-agreements">CI Agreements</TabsTrigger>
        </TabsList>
        <TabsContent value="programs" className="mt-4">
          <ProgramsSection />
        </TabsContent>
        <TabsContent value="agreements" className="mt-4">
          <MyAgreementsSection />
        </TabsContent>
        <TabsContent value="ci-agreements" className="mt-4">
          <CIAgreementsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FranchiseeFranchiseHubPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <FranchiseeFranchiseHubInner />
    </Suspense>
  );
}
