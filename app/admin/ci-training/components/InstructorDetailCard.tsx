"use client";

import React, { useEffect, useState, useRef } from "react";
import { CITrainingData } from "@/services/course-instructor.service";

interface InstructorDetailCardProps {
  instructor: CITrainingData;
  lastRow: boolean;
}

// Create ref for the instructor detail dot to calculate line height
export const instructorDetailDotRef = React.createRef<HTMLDivElement>();

export default function InstructorDetailCard({
  instructor,
  lastRow,
}: InstructorDetailCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    const calculateLineHeight = () => {
      if (containerRef.current && instructorDetailDotRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const dotCenter =
          instructorDetailDotRef.current.getBoundingClientRect().top +
          instructorDetailDotRef.current.offsetHeight / 2;
        setLineHeight(dotCenter - containerTop);
      }
    };

    // Add a small delay to ensure DOM has updated after expansion/collapse
    const timeoutId = setTimeout(calculateLineHeight, 10);

    return () => clearTimeout(timeoutId);
  }, [instructor]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
          {/* Instructor Details */}
          <div className="relative">
            {/* Curved horizontal connecting line with dot */}
            <div
              ref={instructorDetailDotRef}
              className="absolute -left-6 top-4 w-6 h-4"
            >
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h4 className="font-semibold text-lg text-gray-900">
                {instructor.instructorName} - Training Details
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Instructor ID</span>
                  <p className="text-gray-900 mt-1">
                    {instructor.instructorId}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Training Level</span>
                  <p className="text-gray-900 mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getTrainingLevelColor(
                        instructor.displayOrder ?? 1
                      )}`}
                    >
                      {instructor.trainingLevelName || "N/A"}
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Level Order</span>
                  <p className="text-gray-900 mt-1 font-mono">
                    Level {instructor.displayOrder}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Amount</span>
                  <p className="text-gray-900 mt-1 font-medium">
                    {formatCurrency(instructor.amount ?? 0)}
                  </p>
                </div>

                {instructor.installmentCount && (
                  <div>
                    <span className="text-gray-500">EMI Plan</span>
                    <p className="text-gray-900 mt-1">
                      {instructor.installmentCount} months
                    </p>
                  </div>
                )}

                {instructor.installmentAmount && (
                  <div>
                    <span className="text-gray-500">Monthly Installment</span>
                    <p className="text-gray-900 mt-1 font-medium">
                      {formatCurrency(instructor.installmentAmount ?? 0)}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="text-gray-900 mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        instructor.isApproved
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-orange-50 text-orange-700 border border-orange-200"
                      }`}
                    >
                      {instructor.isApproved ? "Completed" : "In Training"}
                    </span>
                  </p>
                </div>

                {instructor.additionalDetails && (
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-gray-500">Additional Details</span>
                    <p className="text-gray-900 mt-1">
                      {instructor.additionalDetails}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
