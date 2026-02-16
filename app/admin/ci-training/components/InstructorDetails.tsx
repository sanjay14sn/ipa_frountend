"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

            <div className="bg-white rounded-lg border border-primary overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Instructor</TableHead>
                    <TableHead className="text-center">Training Level</TableHead>
                    <TableHead className="text-center">Level Order</TableHead>
                    <TableHead className="text-center">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructors.map((instructor) => (
                    <TableRow key={`training-${instructor.id}`} className="hover:bg-gray-50/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="font-medium text-gray-900">
                            {instructor.instructorName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {instructor.instructorId}
                          </div>
                        </div>
                      </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                className={getTrainingLevelColor(instructor.displayOrder)}
                              >
                                {instructor.trainingLevelName || "N/A"}
                              </Badge>
                              {instructor.isActive && (
                                <span className="text-xs text-green-600 font-medium">
                                  Currently Active
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono">
                              Level {instructor.displayOrder}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {formatCurrency(instructor.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            {!isCompleted ? (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                In Training
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                Completed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {!isCompleted && onCompleteTraining && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onCompleteTraining(instructor)}
                                className="text-xs"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Complete Training
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
