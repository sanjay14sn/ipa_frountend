"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/shared";
import { CheckCircle } from "lucide-react";
import { CITrainingData } from "@/services/course-instructor.service";

interface InstructorDetailsProps {
  instructors: CITrainingData[];
  lastRow: boolean;
  onCompleteTraining?: (instructor: CITrainingData) => void;
  isCompleted?: boolean;
}

// Create ref for the last instructor dot to calculate line height
export const instructorDotRef = React.createRef<HTMLDivElement>();

export default function InstructorDetails({
  instructors,
  lastRow,
  onCompleteTraining,
  isCompleted = false,
}: InstructorDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    const calculateLineHeight = () => {
      if (containerRef.current && instructorDotRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const dotCenter =
          instructorDotRef.current.getBoundingClientRect().top +
          instructorDotRef.current.offsetHeight / 2;
        setLineHeight(dotCenter - containerTop);
      }
    };

    const timeoutId = setTimeout(calculateLineHeight, 10);

    return () => clearTimeout(timeoutId);
  }, [instructors]);

  const getTrainingLevelColor = (order: number) => {
    const colors = [
      "bg-blue-50 text-blue-700 border-blue-200",
      "bg-green-50 text-green-700 border-green-200",
      "bg-purple-50 text-purple-700 border-purple-200",
      "bg-orange-50 text-orange-700 border-orange-200",
      "bg-pink-50 text-pink-700 border-pink-200",
    ];
    return colors[(order - 1) % colors.length] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns: DataTableColumn<CITrainingData>[] = [
    {
      key: "trainingLevel",
      header: "Training Level",
      className: "text-center",
      render: (instructor) => (
        <div className="flex flex-col items-center gap-1">
          <Badge className={getTrainingLevelColor(instructor.displayOrder ?? 1)}>
            {instructor.trainingLevelName || "N/A"}
          </Badge>
          {instructor.isActive && (
            <span className="text-xs text-green-600 font-medium">
              Currently Active
            </span>
          )}
        </div>
      ),
    },
    {
      key: "levelOrder",
      header: "Level Order",
      className: "text-center",
      render: (instructor) => (
        <Badge variant="outline" className="font-mono">
          Level {instructor.displayOrder ?? "—"}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-center",
      render: (instructor) => formatCurrency(instructor.amount ?? 0),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: () =>
        !isCompleted ? (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
            In Training
          </Badge>
        ) : (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            Completed
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (instructor) =>
        !isCompleted && onCompleteTraining ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCompleteTraining(instructor)}
            className="text-xs"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete Training
          </Button>
        ) : null,
    },
  ];

  return (
    <div
      className={`bg-gray-50 border-t border-black/20 ${
        lastRow ? "rounded-b-lg" : "border-b border-black/20"
      }`}
    >
      <div className="relative">
        {/* Vertical connecting line from main row */}
        <div
          className="absolute left-6 border-primary border bg-primary"
          style={{ top: 0, height: `${lineHeight - 6}px` }}
        ></div>

        <div className="pl-12 pr-6 py-6 space-y-6" ref={containerRef}>
          {/* Instructors Table */}
          <div className="relative">
            {/* Curved horizontal connecting line with dot */}
            <div
              ref={instructorDotRef}
              className="absolute -left-6 top-4 w-6 h-4"
            >
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>

            <DataTable
              data={instructors}
              columns={columns}
              getRowId={(instructor) => `training-${instructor.id}`}
              renderMainCell={(instructor) => (
                <div className="flex flex-col">
                  <div className="font-medium text-gray-900">
                    {instructor.instructorName}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {instructor.instructorId}
                  </div>
                </div>
              )}
              emptyMessage="No instructors in training"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
