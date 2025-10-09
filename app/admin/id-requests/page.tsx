"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestedIdDetail } from "@/services/student.service";
import IdCardPreviewModal from "./components/IdCardPreviewModal";
import RequestedIdTable from "./components/RequestedIdTable";
import IssuedIdTable from "./components/IssuedIdTable";

export default function AdminIdRequestsPage() {
  const [selectedStudent, setSelectedStudent] =
    useState<RequestedIdDetail | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleIssueId = (student: RequestedIdDetail) => {
    setSelectedStudent(student);
    setIsPreviewModalOpen(true);
  };

  const handleIssueSuccess = () => {
    setIsPreviewModalOpen(false);
    triggerRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            ID Card Management
          </h1>
          <p className="text-muted-foreground">
            Manage student ID card requests and issued cards
          </p>
        </div>
      </div>

      <Tabs defaultValue="requested" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requested">Requested IDs</TabsTrigger>
          <TabsTrigger value="issued">Issued IDs</TabsTrigger>
        </TabsList>

        <TabsContent value="requested" className="space-y-4">
          <RequestedIdTable onIssueId={handleIssueId} refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="issued" className="space-y-4">
          <IssuedIdTable refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      {/* ID Card Preview Modal */}
      {selectedStudent && (
        <IdCardPreviewModal
          open={isPreviewModalOpen}
          onOpenChange={setIsPreviewModalOpen}
          student={selectedStudent}
          onSuccess={handleIssueSuccess}
        />
      )}
    </div>
  );
}
