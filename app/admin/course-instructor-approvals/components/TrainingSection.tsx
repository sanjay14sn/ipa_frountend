import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText, CheckCircle, PlayCircle, DollarSign, Clock } from "lucide-react";
import { AdminCourseInstructorData, getCITrainingProgress, CITrainingProgress } from "@/services/course-instructor.service";
import React, { useEffect, useState, useRef } from "react";
import ApproveTrainingModal from "./ApproveTrainingModal";
import { Loader2 } from "lucide-react";

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
  const [trainingProgress, setTrainingProgress] = useState<CITrainingProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  useEffect(() => {
    if (containerRef.current && trainingInternalDotRef.current && isExpanded) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        trainingInternalDotRef.current.getBoundingClientRect().top +
        trainingInternalDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [isExpanded, instructor]);

  useEffect(() => {
    if (isExpanded && instructor.id) {
      loadTrainingProgress();
    }
  }, [isExpanded, instructor.id]);

  const loadTrainingProgress = async () => {
    try {
      setLoadingProgress(true);
      const progress = await getCITrainingProgress(instructor.id);
      setTrainingProgress(progress);
    } catch (error) {
      console.error("Failed to load training progress:", error);
      setTrainingProgress(null);
    } finally {
      setLoadingProgress(false);
    }
  };

  const getLevelStatus = (levelId: number) => {
    if (!trainingProgress) return null;
    const training = trainingProgress.trainings.find(
      (t) => t.trainingLevelId === levelId
    );
    if (!training) return null;
    
    if (training.isCompleted) {
      return { status: "completed", label: "Completed", icon: CheckCircle, color: "bg-green-600" };
    }
    if (training.isActive) {
      return { status: "active", label: "Active", icon: PlayCircle, color: "bg-green-500" };
    }
    // Check if level exists in training records (means it's registered/paid)
    return { status: "paid", label: "Paid", icon: DollarSign, color: "bg-blue-500" };
  };

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
          {instructor.trainingLevels && instructor.trainingLevels.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {instructor.trainingLevels.length} level(s)
            </Badge>
          )}
          {instructor.totalTrainingAmount !== undefined && instructor.totalTrainingAmount > 0 && (
            <Badge variant="outline" className="ml-2 text-green-600">
              ₹{instructor.totalTrainingAmount.toLocaleString()}
            </Badge>
          )}
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
                  {/* Training Levels Section */}
                  {instructor.trainingLevels && instructor.trainingLevels.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-gray-900">
                          Registered Training Levels
                        </h5>
                        {loadingProgress && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {instructor.trainingLevels.map((level: any, index: number) => {
                          const levelStatus = getLevelStatus(level.id);
                          const StatusIcon = levelStatus?.icon || Clock;
                          const statusColor = levelStatus?.color || "bg-gray-400";
                          
                          return (
                            <div
                              key={level.id}
                              className={`bg-white rounded-lg p-3 border ${
                                levelStatus?.status === "active"
                                  ? "border-green-500 bg-green-50"
                                  : levelStatus?.status === "completed"
                                    ? "border-green-300 bg-green-50/50"
                                    : levelStatus?.status === "paid"
                                      ? "border-blue-300 bg-blue-50/50"
                                      : "border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {level.name}
                                  </Badge>
                                  {levelStatus && (
                                    <Badge
                                      variant="default"
                                      className={`text-xs ${statusColor} text-white flex items-center gap-1`}
                                    >
                                      <StatusIcon className="w-3 h-3" />
                                      {levelStatus.label}
                                    </Badge>
                                  )}
                                  {!levelStatus && (
                                    <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Not Paid
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-sm font-semibold text-green-600">
                                  ₹{level.amount.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                {level.displayOrder && (
                                  <span>Order: {level.displayOrder}</span>
                                )}
                                {levelStatus?.status === "completed" && trainingProgress && (
                                  <span className="text-green-600">
                                    Completed
                                  </span>
                                )}
                                {levelStatus?.status === "active" && (
                                  <span className="text-green-600 font-semibold">
                                    Currently Active
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">
                            Total Amount:
                          </span>
                          <span className="text-lg font-bold text-green-600">
                            ₹{instructor.totalTrainingAmount?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {instructor.trainingProof ? (
                    // Show document if present
                    <div className="text-sm pt-3 border-t border-gray-200">
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
                    // Show training levels and additional info if no document
                    <div className="text-sm space-y-3 pt-3 border-t border-gray-200">
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
                      {!instructor.additionalDetails &&
                        (!instructor.trainingLevels || instructor.trainingLevels.length === 0) && (
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
