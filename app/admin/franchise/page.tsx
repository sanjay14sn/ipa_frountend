"use client";

import { Suspense } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { FranchiseManagementSection } from "./components/franchise-management-section";
import { PendingApprovalsSection } from "./components/pending-approvals-section";
import { ProgramRequestsSection } from "./components/program-requests-section";
import { AdminAgreementsSection } from "./components/admin-agreements-section";

const TABS = ["franchises", "applications", "programs", "agreements"] as const;

function AdminFranchiseHubInner() {
  const [tab, setTab] = useTabFromUrl("franchises", TABS);

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <div className="rounded-2xl border bg-card px-4 py-4 shadow-sm sm:px-5">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            Management
          </div>
          <h1 className="text-2xl text-card-foreground">Franchise Hub</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage franchises, applications, program requests, and agreements.
          </p>
        </div>

        <TabsList className="mt-4 flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="franchises">Franchises</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="programs">Program requests</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
        </TabsList>
      </div>

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
        <AdminAgreementsSection />
      </TabsContent>
    </Tabs>
  );
}

export default function AdminFranchiseHubPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <AdminFranchiseHubInner />
    </Suspense>
  );
}
