"use client";

import React, { useState, useEffect } from "react";
import {
  AppDialog,
  AppDialogHeader,
  AppDialogBody,
} from "@/components/shared/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Award, Calendar, FileText } from "lucide-react";
import {
  getCIGraduations,
  CILevelGraduation,
} from "@/services/course-instructor.service";
import { format } from "date-fns";

interface GraduationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
}

export function GraduationHistoryModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
}: GraduationHistoryModalProps) {
  const [graduations, setGraduations] = useState<CILevelGraduation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGraduations();
    }
  }, [isOpen, instructorId]);

  const loadGraduations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCIGraduations(instructorId);
      setGraduations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load graduation history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppDialog open={isOpen} onOpenChange={onClose} size="xl" scrollBody>
      <AppDialogHeader
        icon={Award}
        title={`Graduation History - ${instructorName}`}
        description="View all completed training levels and certifications"
      />
      <AppDialogBody>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : graduations.length === 0 ? (
          <div className="text-center py-12">
            <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              No graduations recorded yet for this instructor.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {graduations.map((graduation) => (
              <div
                key={graduation.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">
                        {graduation.trainingLevel?.name ??
                          graduation.levelName ??
                          "—"}
                      </h3>
                      {(graduation.trainingLevel?.amount ?? 0) > 0 && (
                        <Badge variant="default">
                          ₹
                          {(
                            graduation.trainingLevel?.amount ?? 0
                          ).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    {graduation.trainingLevel?.description && (
                      <p className="text-sm text-gray-600">
                        {graduation.trainingLevel.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      Graduated on:{" "}
                      <span className="font-medium">
                        {format(
                          new Date(
                            graduation.graduationDate ??
                              graduation.graduatedAt ??
                              0,
                          ),
                          "MMM dd, yyyy",
                        )}
                      </span>
                    </span>
                  </div>

                  {graduation.certificateNumber && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">
                        Certificate:{" "}
                        <span className="font-medium font-mono">
                          {graduation.certificateNumber}
                        </span>
                      </span>
                    </div>
                  )}

                  {graduation.marksObtained !== undefined &&
                    graduation.marksObtained !== null && (
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">
                          Marks Obtained:{" "}
                          <span className="font-medium">
                            {graduation.marksObtained}%
                          </span>
                        </span>
                      </div>
                    )}
                </div>

                {graduation.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Notes: </span>
                      {graduation.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Total Levels Completed:</span>
                <Badge variant="secondary" className="text-base">
                  {graduations.length}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </AppDialogBody>
    </AppDialog>
  );
}

