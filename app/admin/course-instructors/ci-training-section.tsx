"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePageShell } from "@/components/shared";
import { SessionsTab } from "./_components/ci-training/CITrainingSessionsTab";
import { WaitingTab } from "./_components/ci-training/CITrainingWaitingTab";
export function CiTrainingSection() {
  return (
    <TablePageShell embed>
      {/* R6: the hub owns the page header (ADM-16: empty Packages sub-tab removed). */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList data-tour="ci-training-subtabs">
          <TabsTrigger value="sessions">Sessions &amp; Assignments</TabsTrigger>
          <TabsTrigger value="waiting">Waiting List</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="waiting">
          <WaitingTab />
        </TabsContent>
      </Tabs>
    </TablePageShell>
  );
}
