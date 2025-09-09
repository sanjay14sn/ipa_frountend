"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard } from "lucide-react";
import { RequestedIdDetail } from "@/services/student.service";
import {
  useRequestedIdDetails,
  useIssuedIdDetails,
} from "@/hooks/use-students";
import IdCardPreviewModal from "./components/IdCardPreviewModal";
import RequestedIdTable from "./components/RequestedIdTable";
import IssuedIdTable from "./components/IssuedIdTable";

export default function AdminIdRequestsPage() {
  const [selectedStudent, setSelectedStudent] =
    useState<RequestedIdDetail | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Use SWR for data fetching
  const { requestedIds, isLoading } = useRequestedIdDetails();
  const { issuedIds, isLoading: loadingIssued } = useIssuedIdDetails();

  const handleIssueId = (student: RequestedIdDetail) => {
    setSelectedStudent(student);
    setIsPreviewModalOpen(true);
  };

  const totalRequested = Object.values(requestedIds).reduce(
    (total, students) => total + students.length,
    0
  );

  const totalIssued = Object.values(issuedIds).reduce(
    (total, students) => total + students.length,
    0
  );

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
          <TabsTrigger value="requested">
            Requested IDs ({totalRequested})
          </TabsTrigger>
          <TabsTrigger value="issued">Issued IDs ({totalIssued})</TabsTrigger>
        </TabsList>

        <TabsContent value="requested" className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading requested IDs...
            </div>
          ) : (
            <RequestedIdTable data={requestedIds} onIssueId={handleIssueId} />
          )}
        </TabsContent>

        <TabsContent value="issued" className="space-y-4">
          {loadingIssued ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading issued IDs...
            </div>
          ) : (
            <IssuedIdTable data={issuedIds} />
          )}
        </TabsContent>
      </Tabs>

      {/* ID Card Preview Modal */}
      {selectedStudent && (
        <IdCardPreviewModal
          open={isPreviewModalOpen}
          onOpenChange={setIsPreviewModalOpen}
          student={selectedStudent}
          onSuccess={() => setIsPreviewModalOpen(false)}
        />
      )}
    </div>
  );
}
