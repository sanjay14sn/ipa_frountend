import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StudentData } from "@/services/student.service";
import React, { useEffect, useState, useRef } from "react";
import { getStudentLevelName } from "../utils/student-helpers";

interface AcademicSectionProps {
  student: StudentData;
  studentId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export const academicDotRef = React.createRef<HTMLDivElement>();
export const academicInternalDotRef = React.createRef<HTMLDivElement>();

export default function AcademicSection({
  student,
  studentId,
  isExpanded,
  onToggle,
}: AcademicSectionProps) {
  const sectionId = `${studentId}-academic`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  const levelName = getStudentLevelName(student);

  useEffect(() => {
    if (containerRef.current && academicInternalDotRef.current && isExpanded) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        academicInternalDotRef.current.getBoundingClientRect().top +
        academicInternalDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [isExpanded, student]);

  return (
    <div className="relative">
      <div ref={academicDotRef} className="absolute -left-6 top-1 w-6 h-4">
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
          <h4 className="font-medium text-gray-900">Academic Information</h4>
          <Badge variant="outline" className="ml-2">
            {levelName}
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
                  ref={academicInternalDotRef}
                  className="absolute -left-6 top-4 w-6 h-4"
                >
                  <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                  <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-primary">
                  <h5 className="font-semibold text-gray-900">
                    Academic Details
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Level</span>
                      <p className="text-gray-900 mt-1">{levelName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Standard</span>
                      <p className="text-gray-900 mt-1">{student.standard}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Stream</span>
                      <p className="text-gray-900 mt-1">{student.stream}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">ID Status</span>
                      <p className="text-gray-900 mt-1">{student.idIssued}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Enrollment Information
                    </h6>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Enrollment Date</span>
                        <p className="text-gray-900 mt-1">
                          {new Date(student.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status</span>
                        <p className="text-gray-900 mt-1">
                          {student.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Updated</span>
                        <p className="text-gray-900 mt-1">
                          {new Date(student.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Student ID</span>
                        <p className="text-gray-900 mt-1">{student.id}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Level Information
                    </h6>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="text-sm text-gray-600">
                        {levelName && levelName.startsWith("EL") && (
                          <p>
                            Early Learning Level - Foundation stage for young
                            learners
                          </p>
                        )}
                        {levelName && levelName.startsWith("RL") && (
                          <p>
                            Regular Learning Level - Standard academic
                            progression
                          </p>
                        )}
                        {levelName && levelName.startsWith("GML") && (
                          <p>
                            General Mathematics Level - Advanced mathematical
                            concepts
                          </p>
                        )}
                        {levelName === 'N/A' && (
                          <p className="text-gray-500 italic">
                            Level information not available
                          </p>
                        )}
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
