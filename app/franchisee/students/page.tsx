"use client";

import { Suspense } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { StudentsManageSection } from "./students-manage-section";
import { FranchiseeCertificateRequestsSection } from "./components/certificate-requests-section";
import { TablePageShell } from "@/components/shared";

const TABS = ["manage", "certificates"] as const;

function FranchiseeStudentsHubInner() {
  const [tab, setTab] = useTabFromUrl("manage", TABS);

  return (
    <TablePageShell
      title="Students"
      description="Enrolment, certificates, and student contests."
    >
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="manage">Manage students</TabsTrigger>
          <TabsTrigger value="certificates">Certificate requests</TabsTrigger>
        </TabsList>
        <TabsContent value="manage" className="mt-4">
          <StudentsManageSection />
        </TabsContent>
        <TabsContent value="certificates" className="mt-4">
          <FranchiseeCertificateRequestsSection />
        </TabsContent>
      </Tabs>
    </TablePageShell>
  );
}

export default function FranchiseeStudentsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground p-6 text-sm">Loading…</div>
      }
    >
      <FranchiseeStudentsHubInner />
    </Suspense>
  );
}
