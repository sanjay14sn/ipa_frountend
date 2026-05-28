"use client";

import React, { useEffect, useState, useRef } from "react";
import { RequestedIdDetail } from "@/services/student.service";

interface StudentDetailCardProps {
  student: RequestedIdDetail;
  lastRow: boolean;
}

// Create ref for the student detail dot to calculate line height
export const studentDetailDotRef = React.createRef<HTMLDivElement>();

export default function StudentDetailCard({
  student,
  lastRow,
}: StudentDetailCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    const calculateLineHeight = () => {
      if (containerRef.current && studentDetailDotRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const dotCenter =
          studentDetailDotRef.current.getBoundingClientRect().top +
          studentDetailDotRef.current.offsetHeight / 2;
        setLineHeight(dotCenter - containerTop);
      }
    };

    // Add a small delay to ensure DOM has updated after expansion/collapse
    const timeoutId = setTimeout(calculateLineHeight, 10);

    return () => clearTimeout(timeoutId);
  }, [student]);

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
          {/* Student Details */}
          <div className="relative">
            {/* Curved horizontal connecting line with dot */}
            <div
              ref={studentDetailDotRef}
              className="absolute -left-6 top-4 w-6 h-4"
            >
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h4 className="font-semibold text-lg text-gray-900">
                {student.name} - Detailed Information
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Roll Number</span>
                  <p className="mt-1 rounded bg-muted px-1.5 py-1 font-mono text-xs">{student.rollNo}</p>
                </div>

                {student.dateOfBirth && (
                  <div>
                    <span className="text-gray-500">Date of Birth</span>
                    <p className="text-gray-900 mt-1">
                      {new Date(student.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {student.idIssueDate && (
                  <div>
                    <span className="text-gray-500">ID Issue Date</span>
                    <p className="text-gray-900 mt-1">
                      {new Date(student.idIssueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {student.fatherContactNo && (
                  <div>
                    <span className="text-gray-500">Father Contact</span>
                    <p className="text-gray-900 mt-1">
                      {student.fatherContactNo}
                    </p>
                  </div>
                )}

                {student.motherContactNo && (
                  <div>
                    <span className="text-gray-500">Mother Contact</span>
                    <p className="text-gray-900 mt-1">
                      {student.motherContactNo}
                    </p>
                  </div>
                )}

                {student.residentialAddress && (
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-gray-500">Residential Address</span>
                    <p className="text-gray-900 mt-1">
                      {student.residentialAddress}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-gray-500">Franchise</span>
                  <p className="text-gray-900 mt-1">{student.franchiseName}</p>
                </div>

                {student.franchiseeAddress && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Franchise Address</span>
                    <p className="text-gray-900 mt-1">
                      {student.franchiseeAddress}
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
