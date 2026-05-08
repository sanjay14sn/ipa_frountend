"use client";

import { Suspense } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { MyAgreementsSection } from "./components/my-agreements-section";
import { ProgramAgreementsSection } from "./components/program-agreements-section";
import { CIAgreementsSection } from "./components/ci-agreements-section";

const TABS = ["agreements", "programs", "ci-agreements"] as const;

function FranchiseeFranchiseHubInner() {
  const [tab, setTab] = useTabFromUrl("agreements", TABS);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Franchise</h1>
        <p className="text-muted-foreground">
          Signed agreements and program fee agreements for your centre.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="agreements">My agreements</TabsTrigger>
          <TabsTrigger value="programs">Program agreements</TabsTrigger>
          <TabsTrigger value="ci-agreements">CI agreements</TabsTrigger>
        </TabsList>
        <TabsContent value="agreements" className="mt-4">
          <MyAgreementsSection />
        </TabsContent>
        <TabsContent value="programs" className="mt-4">
          <ProgramAgreementsSection />
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
