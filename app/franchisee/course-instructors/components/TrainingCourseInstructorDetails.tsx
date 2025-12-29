import { useEffect, useState, useRef } from "react";
import { TrainingCourseInstructorData } from "@/services/course-instructor.service";

interface TrainingCourseInstructorDetailsProps {
  courseInstructor: TrainingCourseInstructorData;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: TrainingCourseInstructorData
  ) => void;
}

export default function TrainingCourseInstructorDetails({
  courseInstructor,
  lastRow,
  expandedRows,
  onToggleRow,
  onCourseInstructorUpdate,
}: TrainingCourseInstructorDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  // Helper function to format currency
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "N/A";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to format number or return N/A
  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return "N/A";
    }
    return value.toString();
  };

  // Helper function to format text or return N/A
  const formatText = (value: string | null | undefined): string => {
    if (!value || value.trim() === "" || value === "null" || value === "undefined") {
      return "N/A";
    }
    return value;
  };

  useEffect(() => {
    const calculateLineHeight = () => {
      if (containerRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;

        // Fallback if no specific section is rendered yet
        const firstSection = containerRef.current.querySelector(".relative");
        if (firstSection) {
          const sectionTop = firstSection.getBoundingClientRect().top;
          setLineHeight(sectionTop - containerTop + 20);
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
          {/* Course Instructor Basic Details */}
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
                  <span className="text-gray-500">Training Level</span>
                  <p className="text-gray-900 mt-1">
                    {formatText(courseInstructor.trainingLevelName || "N/A")}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="text-gray-900 mt-1">
                    {formatText(courseInstructor.status)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Total Amount</span>
                  <p className="text-gray-900 mt-1">
                    {formatCurrency(courseInstructor.amount)}
                  </p>
                </div>
                {courseInstructor.paidAmount && (
                  <div>
                    <span className="text-gray-500">Paid Amount</span>
                    <p className="text-green-600 mt-1">
                      {formatCurrency(courseInstructor.paidAmount)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Details Section */}
          {courseInstructor.additionalDetails && (
            <div className="relative">
              <div className="absolute -left-6 top-4 w-6 h-4">
                <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
              </div>
              <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
                <h4 className="font-semibold text-lg text-gray-900">
                  Additional Details
                </h4>
                <div className="text-sm text-gray-700">
                  {courseInstructor.additionalDetails}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
