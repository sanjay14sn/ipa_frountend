"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePageShell } from "@/components/shared";
import { ClipboardList } from "lucide-react";
import { SessionsTab } from "@/app/admin/course-instructors/ci-training/CITrainingSessionsTab";
import { WaitingTab } from "@/app/admin/course-instructors/ci-training/CITrainingWaitingTab";
// import { CITrainingPackagesManager } from "../catalog/ci-training-packages/page";

export function CiTrainingSection() {
  return (
    <TablePageShell>
      <div className="rounded-2xl border bg-card px-4 py-4 shadow-sm sm:px-5">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl text-card-foreground">CI Training</h1>
            <p className="text-muted-foreground text-sm">
              Manage training sessions, assignments and marks
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Sessions &amp; Assignments</TabsTrigger>
          <TabsTrigger value="waiting">Waiting List</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="waiting">
          <WaitingTab />
        </TabsContent>
        <TabsContent value="packages">
          {/*<CITrainingPackagesManager />*/}
        </TabsContent>
      </Tabs>
    </TablePageShell>
  );
}
