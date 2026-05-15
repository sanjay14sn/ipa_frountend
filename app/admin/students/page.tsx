"use client";

import { Suspense } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { IdRequestsSection } from "./components/id-requests-section";
import { CertificateRequestsSection } from "./components/certificate-requests-section";
import { StudentLifecycleSection } from "./components/student-lifecycle-section";
import { TablePageShell } from "@/components/shared";

const TABS = ["ids", "certificates", "lifecycle"] as const;

function AdminStudentsHubInner() {
  const [tab, setTab] = useTabFromUrl("ids", TABS);

  return (
    <TablePageShell
      title="Students"
      description="ID cards, certificates, and student-related admin workflows."
    >
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="ids">ID requests</TabsTrigger>
          <TabsTrigger value="certificates">Certificate requests</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
        </TabsList>
        <TabsContent value="ids" className="mt-4">
          <IdRequestsSection />
        </TabsContent>
        <TabsContent value="certificates" className="mt-4">
          <CertificateRequestsSection />
        </TabsContent>
        <TabsContent value="lifecycle" className="mt-4">
          <StudentLifecycleSection />
        </TabsContent>
      </Tabs>
    </TablePageShell>
  );
}

export default function AdminStudentsHubPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <AdminStudentsHubInner />
    </Suspense>
  );
}
