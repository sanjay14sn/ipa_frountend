import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AdminCourseInstructorData } from "@/services/course-instructor.service";
import React, { useEffect, useState, useRef } from "react";

interface ProfessionalInfoSectionProps {
  instructor: AdminCourseInstructorData;
  instructorId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export const professionalDotRef = React.createRef<HTMLDivElement>();
export const professionalInternalDotRef = React.createRef<HTMLDivElement>();

export default function ProfessionalInfoSection({
  instructor,
  instructorId,
  isExpanded,
  onToggle,
}: ProfessionalInfoSectionProps) {
  const sectionId = `${instructorId}-professional`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    if (
      containerRef.current &&
      professionalInternalDotRef.current &&
      isExpanded
    ) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        professionalInternalDotRef.current.getBoundingClientRect().top +
        professionalInternalDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [isExpanded, instructor]);

  return (
    <div className="relative">
      <div ref={professionalDotRef} className="absolute -left-6 top-1 w-6 h-4">
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
          <h4 className="font-medium text-gray-900">
            Professional Information
          </h4>
          <Badge variant="outline" className="ml-2">
            {instructor.education || "N/A"}
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
                  ref={professionalInternalDotRef}
                  className="absolute -left-6 top-4 w-6 h-4"
                >
                  <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                  <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-primary">
                  <h5 className="font-semibold text-gray-900">
                    Educational Details
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Education</span>
                      <p className="text-gray-900 mt-1">
                        {instructor.education || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Occupation</span>
                      <p className="text-gray-900 mt-1">
                        {instructor.occupation || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Reference</span>
                      <p className="text-gray-900 mt-1">
                        {instructor.reference || "No reference"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p className="text-gray-900 mt-1">{instructor.status}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Application Information
                    </h6>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Application Date</span>
                        <p className="text-gray-900 mt-1">
                          {new Date(instructor.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status</span>
                        <p className="text-gray-900 mt-1">
                          {instructor.status}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Updated</span>
                        <p className="text-gray-900 mt-1">
                          {new Date(instructor.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Instructor ID</span>
                        <p className="text-gray-900 mt-1">{instructor.id}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Background Information
                    </h6>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="text-sm text-gray-600">
                        {instructor.education && instructor.occupation && (
                          <p>
                            {instructor.education} with current occupation as{" "}
                            {instructor.occupation}
                          </p>
                        )}
                        {instructor.education && !instructor.occupation && (
                          <p>Educational background: {instructor.education}</p>
                        )}
                        {!instructor.education && instructor.occupation && (
                          <p>Current occupation: {instructor.occupation}</p>
                        )}
                        {!instructor.education && !instructor.occupation && (
                          <p>
                            No educational or occupational information provided
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
