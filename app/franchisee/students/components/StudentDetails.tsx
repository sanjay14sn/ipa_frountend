import { useEffect, useState, useRef } from "react";
import { StudentData } from "@/services/student.service";
import ParentSection, { parentDotRef } from "./ParentSection";
import AcademicSection, { academicDotRef } from "./AcademicSection";
import ContactSection, { contactDotRef } from "./ContactSection";

interface StudentDetailsProps {
  student: StudentData;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
  onStudentUpdate?: (updatedStudent: StudentData) => void;
}

export default function StudentDetails({
  student,
  lastRow,
  expandedRows,
  onToggleRow,
  onStudentUpdate,
}: StudentDetailsProps) {
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
  }, [student, expandedRows]);

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
            <div className="absolute -left-6 top-4 w-6 h-4">
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>
            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h3 className="font-semibold text-lg text-gray-900">
                {student.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Roll Number</span>
                  <p className="text-gray-900 mt-1">{student.rollNo}</p>
                </div>
                <div>
                  <span className="text-gray-500">Age</span>
                  <p className="text-gray-900 mt-1">
                    {calculateAge(student.dateOfBirth)} years
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Gender</span>
                  <p className="text-gray-900 mt-1">{student.sex}</p>
                </div>
                <div>
                  <span className="text-gray-500">Standard</span>
                  <p className="text-gray-900 mt-1">{student.standard}</p>
                </div>
                <div>
                  <span className="text-gray-500">Level</span>
                  <p className="text-gray-900 mt-1">{student.level}</p>
                </div>
                <div>
                  <span className="text-gray-500">Stream</span>
                  <p className="text-gray-900 mt-1">{student.stream}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="text-gray-900 mt-1">
                    {student.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">ID Status</span>
                  <p className="text-gray-900 mt-1">{student.idIssued}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Parent Section */}
          <ParentSection
            student={student}
            studentId={student.id.toString()}
            isExpanded={expandedRows.has(`${student.id}-parents`)}
            onToggle={onToggleRow}
          />

          {/* Academic Section */}
          <AcademicSection
            student={student}
            studentId={student.id.toString()}
            isExpanded={expandedRows.has(`${student.id}-academic`)}
            onToggle={onToggleRow}
          />

          {/* Contact Section */}
          <ContactSection
            student={student}
            studentId={student.id.toString()}
            isExpanded={expandedRows.has(`${student.id}-contact`)}
            onToggle={onToggleRow}
          />
        </div>
      </div>
    </div>
  );
}
