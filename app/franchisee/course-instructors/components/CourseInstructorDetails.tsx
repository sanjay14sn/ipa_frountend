import { useEffect, useState, useRef } from "react";
import { CourseInstructorData } from "@/services/course-instructor.service";
import ProfessionalInfoSection, {
  professionalDotRef,
} from "./ProfessionalInfoSection";
import ContactInfoSection, { contactDotRef } from "./ContactInfoSection";

interface CourseInstructorDetailsProps {
  courseInstructor: CourseInstructorData;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
  ) => void;
}

export default function CourseInstructorDetails({
  courseInstructor,
  lastRow,
  expandedRows,
  onToggleRow,
  onCourseInstructorUpdate,
}: CourseInstructorDetailsProps) {
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
    const calculateLineHeight = () => {
      if (containerRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;

        // Always use contact section dot as reference for the vertical line
        if (contactDotRef.current) {
          const dotCenter =
            contactDotRef.current.getBoundingClientRect().top +
            contactDotRef.current.offsetHeight / 2;
          setLineHeight(dotCenter - containerTop);
        } else {
          // Fallback if contact section is not rendered yet
          const firstSection = containerRef.current.querySelector(".relative");
          if (firstSection) {
            const sectionTop = firstSection.getBoundingClientRect().top;
            setLineHeight(sectionTop - containerTop + 20);
          }
        }
      }
    };

    // Add a small delay to ensure DOM has updated after expansion/collapse
    const timeoutId = setTimeout(calculateLineHeight, 10);

    return () => clearTimeout(timeoutId);
  }, [courseInstructor, expandedRows]);

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
          {/* Course Instructor Details */}
          <div className="relative">
            {/* Curved horizontal connecting line with dot */}
            <div className="absolute -left-6 top-4 w-6 h-4">
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>
            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h3 className="font-semibold text-lg text-gray-900">
                {courseInstructor.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Instructor ID</span>
                  <p className="text-gray-900 mt-1">
                    {courseInstructor.instructorId}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Age</span>
                  <p className="text-gray-900 mt-1">
                    {calculateAge(courseInstructor.dob)} years
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Blood Group</span>
                  <p className="text-gray-900 mt-1">
                    {courseInstructor.bloodGroup}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">City</span>
                  <p className="text-gray-900 mt-1">{courseInstructor.city}</p>
                </div>
                <div>
                  <span className="text-gray-500">Education</span>
                  <p className="text-gray-900 mt-1">
                    {courseInstructor.education}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Occupation</span>
                  <p className="text-gray-900 mt-1">
                    {courseInstructor.occupation}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="text-gray-900 mt-1">
                    {courseInstructor.status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Section */}
          <ProfessionalInfoSection
            courseInstructor={courseInstructor}
            courseInstructorId={courseInstructor.id.toString()}
            isExpanded={expandedRows.has(`${courseInstructor.id}-professional`)}
            onToggle={onToggleRow}
          />

          {/* Contact Section */}
          <ContactInfoSection
            courseInstructor={courseInstructor}
            courseInstructorId={courseInstructor.id.toString()}
            isExpanded={expandedRows.has(`${courseInstructor.id}-contact`)}
            onToggle={onToggleRow}
          />
        </div>
      </div>
    </div>
  );
}
