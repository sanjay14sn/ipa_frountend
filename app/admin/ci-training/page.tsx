"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";
import { CITrainingData } from "@/services/course-instructor.service";
import {
  useCITrainingData,
  completeTrainingWithRevalidation,
} from "@/hooks/use-course-instructors";
import TrainingPreviewModal from "./components/TrainingPreviewModal";
import PendingTrainingTable from "./components/PendingTrainingTable";
import CompletedTrainingTable from "./components/CompletedTrainingTable";
import CompleteTrainingConfirmation from "./components/CompleteTrainingConfirmation";

export default function AdminCITrainingPage() {
  const [selectedInstructor, setSelectedInstructor] =
    useState<CITrainingData | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Use SWR for data fetching
  const { trainingData, isLoading } = useCITrainingData();

  const handleCompleteTrainingClick = (instructor: CITrainingData) => {
    setSelectedInstructor(instructor);
    setIsConfirmationOpen(true);
  };

  const handleConfirmCompleteTraining = async () => {
    if (!selectedInstructor) return;

    try {
      setIsCompleting(true);
      await completeTrainingWithRevalidation(selectedInstructor.id);
      setIsConfirmationOpen(false);
      setSelectedInstructor(null);
      // Optionally show a success message or toast
    } catch (error) {
      console.error("Error completing training:", error);
      // Optionally show an error message or toast
    } finally {
      setIsCompleting(false);
    }
  };

  // Separate pending and completed training
  const pendingTraining = Object.values(trainingData).reduce(
    (acc, instructors) => {
      const pending = instructors.filter(
        (instructor) => !(instructor as any).isApproved
      );
      return [...acc, ...pending];
    },
    [] as CITrainingData[]
  );

  const completedTraining = Object.values(trainingData).reduce(
    (acc, instructors) => {
      const completed = instructors.filter(
        (instructor) => (instructor as any).isApproved
      );
      return [...acc, ...completed];
    },
    [] as CITrainingData[]
  );

  const totalPending = pendingTraining.length;
  const totalCompleted = completedTraining.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            CI Training Monitor
          </h1>
          <p className="text-muted-foreground">
            Monitor course instructor training progress and completion status
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Ongoing Training ({totalPending})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed Training ({totalCompleted})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading ongoing training...
            </div>
          ) : (
            <PendingTrainingTable
              data={trainingData}
              onCompleteTraining={handleCompleteTrainingClick}
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading completed training...
            </div>
          ) : (
            <CompletedTrainingTable data={trainingData} />
          )}
        </TabsContent>
      </Tabs>

      {/* Training Preview Modal */}
      {selectedInstructor && (
        <TrainingPreviewModal
          open={isPreviewModalOpen}
          onOpenChange={setIsPreviewModalOpen}
          instructor={selectedInstructor}
          onSuccess={() => setIsPreviewModalOpen(false)}
        />
      )}

      {/* Complete Training Confirmation Dialog */}
      <CompleteTrainingConfirmation
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        instructor={selectedInstructor}
        onConfirm={handleConfirmCompleteTraining}
        isCompleting={isCompleting}
      />
    </div>
  );
}
