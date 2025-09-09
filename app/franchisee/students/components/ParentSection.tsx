import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StudentData } from "@/services/student.service";
import React, { useEffect, useState, useRef } from "react";

interface ParentSectionProps {
  student: StudentData;
  studentId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export const parentDotRef = React.createRef<HTMLDivElement>();
export const parentInternalDotRef = React.createRef<HTMLDivElement>();

export default function ParentSection({
  student,
  studentId,
  isExpanded,
  onToggle,
}: ParentSectionProps) {
  const sectionId = `${studentId}-parents`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    if (containerRef.current && parentInternalDotRef.current && isExpanded) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        parentInternalDotRef.current.getBoundingClientRect().top +
        parentInternalDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [isExpanded, student]);

  return (
    <div className="relative">
      <div ref={parentDotRef} className="absolute -left-6 top-1 w-6 h-4">
        <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
        <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
      </div>
      <div className="bg-white rounded-lg border border-primary">
        <div className="p-2 flex items-center gap-2">
          <button
            onClick={() => onToggle(sectionId)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <h4 className="font-medium text-gray-900">Parent Information</h4>
          <Badge variant="outline" className="ml-2">
            2
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
                  ref={parentInternalDotRef}
                  className="absolute -left-6 top-4 w-6 h-4"
                >
                  <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                  <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-primary">
                  <h5 className="font-semibold text-gray-900">
                    Father's Details
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Name</span>
                      <p className="text-gray-900 mt-1">{student.fatherName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Contact</span>
                      <p className="text-gray-900 mt-1">
                        {student.fatherContactNo}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Qualification</span>
                      <p className="text-gray-900 mt-1">
                        {student.fatherQualification || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Occupation</span>
                      <p className="text-gray-900 mt-1">
                        {student.fatherOccupation || "Not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Mother's Details
                    </h6>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Name</span>
                        <p className="text-gray-900 mt-1">
                          {student.motherName}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Contact</span>
                        <p className="text-gray-900 mt-1">
                          {student.motherContactNo}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Qualification</span>
                        <p className="text-gray-900 mt-1">
                          {student.motherQualification || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Occupation</span>
                        <p className="text-gray-900 mt-1">
                          {student.motherOccupation || "Not specified"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
