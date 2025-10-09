import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText, CheckCircle } from "lucide-react";
import { AdminCourseInstructorData } from "@/services/course-instructor.service";
import React, { useEffect, useState, useRef } from "react";
import ApproveTrainingModal from "./ApproveTrainingModal";

interface TrainingSectionProps {
  instructor: AdminCourseInstructorData;
  instructorId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export const trainingDotRef = React.createRef<HTMLDivElement>();
export const trainingInternalDotRef = React.createRef<HTMLDivElement>();

export default function TrainingSection({
  instructor,
  instructorId,
  isExpanded,
  onToggle,
}: TrainingSectionProps) {
  const sectionId = `${instructorId}-training`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);

  useEffect(() => {
    if (containerRef.current && trainingInternalDotRef.current && isExpanded) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        trainingInternalDotRef.current.getBoundingClientRect().top +
        trainingInternalDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [isExpanded, instructor]);

  return (
    <div className="relative">
      <div ref={trainingDotRef} className="absolute -left-6 top-1 w-6 h-4">
        <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
        <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
      </div>
      <div className="bg-white rounded-lg border border-primary">
        <div className="p-2 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(sectionId);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <h4 className="font-medium text-gray-900">Training Information</h4>
          <Badge variant="outline" className="ml-2">
            {instructor.trainingType || "N/A"}
          </Badge>
        </div>

        {isExpanded && (
          <div className="relative border-t border-black" ref={containerRef}>
            <div
              className="absolute left-6 border-primary border bg-primary"
              style={{ top: 0, height: `${lineHeight - 6}px` }}
            ></div>
            <div className="pl-12 pr-4 py-4">
              <div className="relative">
                <div
                  ref={trainingInternalDotRef}
                  className="absolute -left-6 top-4 w-6 h-4"
                >
                  <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                  <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-primary">
                  {instructor.trainingProof ? (
                    // Show document if present
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium text-gray-900">
                          Training Document
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(instructor.trainingProof, "_blank")
                        }
                        className="text-xs"
                      >
                        View Training Document
                      </Button>
                    </div>
                  ) : (
                    // Show training type and additional info if no document
                    <div className="text-sm space-y-3">
                      {instructor.trainingType && (
                        <div>
                          <span className="text-gray-500">Training Type</span>
                          <p className="text-gray-900 mt-1">
                            {instructor.trainingType}
                          </p>
                        </div>
                      )}
                      {instructor.additionalDetails && (
                        <div>
                          <span className="text-gray-500">
                            Additional Details
                          </span>
                          <p className="text-gray-900 mt-1">
                            {instructor.additionalDetails}
                          </p>
                        </div>
                      )}
                      {!instructor.trainingType &&
                        !instructor.additionalDetails && (
                          <p className="text-gray-500">
                            No training information available
                          </p>
                        )}
                    </div>
                  )}

                  {/* Approve Training Button */}
                  <div className="pt-3 border-t border-gray-200">
                    <Button
                      onClick={() => setIsApproveModalOpen(true)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approve Training Modal */}
      <ApproveTrainingModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        instructorId={instructorId}
        instructorName={instructor.name}
        onSuccess={() => {
          // Optionally refresh data or show success message
        }}
      />
    </div>
  );
}
