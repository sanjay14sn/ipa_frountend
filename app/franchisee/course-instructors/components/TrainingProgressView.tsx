"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  DollarSign,
  AlertCircle,
  Plus,
  Package,
} from "lucide-react";
import {
  getCITrainingProgress,
  CITrainingProgress,
} from "@/services/course-instructor.service";
import { getActiveTrainingLevels, TrainingLevel } from "@/services/training-level.service";
import { MultiLevelTrainingPaymentModal } from "./MultiLevelTrainingPaymentModal";
import { RequestTrainingModal } from "./RequestTrainingModal";
import { RequestMaterialsModal } from "./RequestMaterialsModal";

interface TrainingProgressViewProps {
  instructorId: number;
  instructorName: string;
  onPaymentSuccess?: () => void;
}

export function TrainingProgressView({
  instructorId,
  instructorName,
  onPaymentSuccess,
}: TrainingProgressViewProps) {
  const [progress, setProgress] = useState<CITrainingProgress | null>(null);
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [requestTrainingModalOpen, setRequestTrainingModalOpen] = useState(false);
  const [requestMaterialsModalOpen, setRequestMaterialsModalOpen] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [instructorId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const [progressData, levels] = await Promise.all([
        getCITrainingProgress(instructorId),
        getActiveTrainingLevels().catch(() => []), // Fallback to empty array if fails
      ]);
      setProgress(progressData);
      setTrainingLevels(levels);
    } catch (err: any) {
      setError(err.message || "Failed to load training progress");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    loadProgress();
    onPaymentSuccess?.();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check if there are any available training levels (excluding active one)
  const activeTrainingLevelId = progress?.activeTraining?.trainingLevelId;
  const availableLevels = trainingLevels.filter(
    (level) => level.id !== activeTrainingLevelId
  );
  const hasAvailableLevels = availableLevels.length > 0;

  const unpaidTrainings = progress?.trainings?.filter(
    (t) => !t.paid && !t.isCompleted
  ) || [];
  const hasUnpaidLevels = unpaidTrainings.length > 0;

  // If no trainings exist, show empty state with request button
  if (!progress || !progress.trainings || progress.trainings.length === 0) {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Training Progress</CardTitle>
              {hasAvailableLevels && (
                <Button
                  size="sm"
                  onClick={() => setRequestTrainingModalOpen(true)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Request Training
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                No training levels registered for this instructor.
                {hasAvailableLevels && " Click 'Request Training' to get started."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Request Training Modal */}
        <RequestTrainingModal
          isOpen={requestTrainingModalOpen}
          onClose={() => setRequestTrainingModalOpen(false)}
          instructorId={instructorId}
          instructorName={instructorName}
          onSuccess={() => {
            loadProgress();
            onPaymentSuccess?.();
          }}
        />
      </>
    );
  }


  return (
    <>
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
            <CardTitle>Training Progress</CardTitle>
            <div className="flex items-center gap-2">
              {hasAvailableLevels && (
                <Button
                  size="sm"
                  onClick={() => setRequestTrainingModalOpen(true)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Request Training
                </Button>
              )}
              {hasUnpaidLevels && (
                <Button
                  size="sm"
                  onClick={() => setPaymentModalOpen(true)}
                  variant="default"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Pay for Levels
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {progress.completedTrainings} of {progress.totalTrainings} completed
              </span>
              <span className="font-medium text-gray-900">
                {progress.progress.toFixed(0)}%
              </span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>

          {/* Active Training Highlight */}
          {progress.activeTraining && (
            <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Active:</span>{" "}
                  {progress.activeTraining.trainingLevelName}
                </p>
                <Button
                  size="sm"
                  onClick={() => setRequestMaterialsModalOpen(true)}
                  variant="outline"
                  className="ml-2"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Request Materials
                </Button>
              </div>
            </div>
          )}

          {/* Training Levels List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              Training Levels ({progress.trainings.length})
            </h3>
            <div className="space-y-2">
              {progress.trainings.map((training) => (
                <div
                  key={training.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-sm font-medium text-gray-500 w-6">
                      {training.displayOrder}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {training.trainingLevelName}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        ₹{training.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {training.paid ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                        Unpaid
                      </Badge>
                    )}
                    {training.isCompleted && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        Completed
                      </Badge>
                    )}
                    {training.isActive && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="pt-3 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {progress.totalTrainings}
                </p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {progress.completedTrainings}
                </p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {unpaidTrainings.length}
                </p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <MultiLevelTrainingPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        instructorId={instructorId}
        instructorName={instructorName}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Request Training Modal */}
      <RequestTrainingModal
        isOpen={requestTrainingModalOpen}
        onClose={() => setRequestTrainingModalOpen(false)}
        instructorId={instructorId}
        instructorName={instructorName}
        onSuccess={() => {
          loadProgress();
          onPaymentSuccess?.();
        }}
      />

      {/* Request Materials Modal */}
      <RequestMaterialsModal
        isOpen={requestMaterialsModalOpen}
        onClose={() => setRequestMaterialsModalOpen(false)}
        instructorId={instructorId}
        instructorName={instructorName}
        onSuccess={() => {
          loadProgress();
          onPaymentSuccess?.();
        }}
      />
    </>
  );
}

