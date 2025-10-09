import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CourseInstructorData } from "@/services/course-instructor.service";
import React, { useEffect, useState, useRef } from "react";

interface ContactInfoSectionProps {
  courseInstructor: CourseInstructorData;
  courseInstructorId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export const contactDotRef = React.createRef<HTMLDivElement>();
export const contactInternalDotRef = React.createRef<HTMLDivElement>();

export default function ContactInfoSection({
  courseInstructor,
  courseInstructorId,
  isExpanded,
  onToggle,
}: ContactInfoSectionProps) {
  const sectionId = `${courseInstructorId}-contact`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  useEffect(() => {
    if (containerRef.current && contactInternalDotRef.current && isExpanded) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        contactInternalDotRef.current.getBoundingClientRect().top +
        contactInternalDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [isExpanded, courseInstructor]);

  return (
    <div className="relative">
      <div ref={contactDotRef} className="absolute -left-6 top-1 w-6 h-4">
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
          <h4 className="font-medium text-gray-900">Contact & Address</h4>
          <Badge variant="outline" className="ml-2">
            {calculateAge(courseInstructor.dob)}y
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
                  ref={contactInternalDotRef}
                  className="absolute -left-6 top-4 w-6 h-4"
                >
                  <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                  <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-primary">
                  <h5 className="font-semibold text-gray-900">
                    Personal Information
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Full Name</span>
                      <p className="text-gray-900 mt-1">
                        {courseInstructor.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Date of Birth</span>
                      <p className="text-gray-900 mt-1">
                        {new Date(courseInstructor.dob).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Age</span>
                      <p className="text-gray-900 mt-1">
                        {calculateAge(courseInstructor.dob)} years old
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Blood Group</span>
                      <p className="text-gray-900 mt-1">
                        {courseInstructor.bloodGroup}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Contact Information
                    </h6>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Email Address</span>
                        <p className="text-gray-900 mt-1">
                          {courseInstructor.mail}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone Number</span>
                        <p className="text-gray-900 mt-1">
                          {courseInstructor.phone}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Instructor ID</span>
                        <p className="text-gray-900 mt-1">
                          {courseInstructor.instructorId}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">City</span>
                        <p className="text-gray-900 mt-1">
                          {courseInstructor.city}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Address Information
                    </h6>
                    <div className="space-y-4">
                      <div>
                        <span className="text-gray-500">Complete Address</span>
                        <div className="bg-gray-100 rounded-lg p-3 mt-1">
                          <p className="text-gray-900 leading-relaxed">
                            {courseInstructor.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Additional Information
                    </h6>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">
                          Course Instructor ID
                        </span>
                        <p className="text-gray-900 mt-1">
                          {courseInstructor.id}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Registration Date</span>
                        <p className="text-gray-900 mt-1">
                          {new Date(
                            courseInstructor.createdAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Updated</span>
                        <p className="text-gray-900 mt-1">
                          {new Date(
                            courseInstructor.updatedAt
                          ).toLocaleDateString()}
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
