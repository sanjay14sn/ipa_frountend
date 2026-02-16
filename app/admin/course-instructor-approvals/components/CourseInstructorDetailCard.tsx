"use client";

import { useEffect, useState, useRef } from "react";
import {
  AdminCourseInstructorData,
  getInstructorTrainingLevelCount,
} from "@/services/course-instructor.service";
import ContactInfoSection, { contactDotRef } from "./ContactInfoSection";
import ProfessionalInfoSection, {
  professionalDotRef,
} from "./ProfessionalInfoSection";
import TrainingSection, {
  trainingDotRef,
  trainingInternalDotRef,
} from "./TrainingSection";

interface CourseInstructorDetailCardProps {
  instructor: AdminCourseInstructorData;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
}

export default function CourseInstructorDetailCard({
  instructor,
  lastRow,
  expandedRows,
  onToggleRow,
}: CourseInstructorDetailCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  const calculateAge = (dateOfBirth: string): number => {
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

        if (contactDotRef.current) {
          const dotCenter =
            contactDotRef.current.getBoundingClientRect().top +
            contactDotRef.current.offsetHeight / 2;
          setLineHeight(dotCenter - containerTop);
        } else {
          const firstSection = containerRef.current.querySelector(".relative");
          if (firstSection) {
            const sectionTop = firstSection.getBoundingClientRect().top;
            setLineHeight(sectionTop - containerTop + 20);
          }
        }
      }
    };

    const timeoutId = setTimeout(calculateLineHeight, 10);

    return () => clearTimeout(timeoutId);
  }, [instructor, expandedRows]);

  return (
    <div
      className={`bg-gray-50 border-t border-black/20 ${
        lastRow ? "rounded-b-lg" : "border-b border-black/20"
      }`}
    >
      <div className="relative">
        <div
          className="absolute left-6 border-primary border bg-primary"
          style={{ top: 0, height: `${lineHeight - 6}px` }}
        ></div>

        <div className="pl-12 pr-6 py-6 space-y-6" ref={containerRef}>
          <div className="relative">
            <div className="absolute -left-6 top-4 w-6 h-4">
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>
            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h3 className="font-semibold text-lg text-gray-900">
                {instructor.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Instructor ID</span>
                  <p className="text-gray-900 mt-1">
                    {instructor.instructorId}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Age</span>
                  <p className="text-gray-900 mt-1">
                    {calculateAge(instructor.dob.toString())} years
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Blood Group</span>
                  <p className="text-gray-900 mt-1">{instructor.bloodGroup}</p>
                </div>
                <div>
                  <span className="text-gray-500">City</span>
                  <p className="text-gray-900 mt-1">{instructor.city}</p>
                </div>
                <div>
                  <span className="text-gray-500">Education</span>
                  <p className="text-gray-900 mt-1">{instructor.education}</p>
                </div>
                <div>
                  <span className="text-gray-500">Occupation</span>
                  <p className="text-gray-900 mt-1">{instructor.occupation}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="text-gray-900 mt-1">{instructor.status}</p>
                </div>
                <div>
                  <span className="text-gray-500">Franchise</span>
                  <p className="text-gray-900 mt-1">
                    {instructor.franchise.name}
                  </p>
                </div>
                {getInstructorTrainingLevelCount(instructor) > 0 && (
                  <div>
                    <span className="text-gray-500">Training Levels</span>
                    <p className="text-gray-900 mt-1 font-medium">
                      {getInstructorTrainingLevelCount(instructor)} level(s)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ProfessionalInfoSection
            instructor={instructor}
            instructorId={instructor.id.toString()}
            isExpanded={expandedRows.has(`${instructor.id}-professional`)}
            onToggle={onToggleRow}
          />

          <TrainingSection
            instructor={instructor}
            instructorId={instructor.id.toString()}
            isExpanded={expandedRows.has(`${instructor.id}-training`)}
            onToggle={onToggleRow}
          />

          <ContactInfoSection
            instructor={instructor}
            instructorId={instructor.id.toString()}
            isExpanded={expandedRows.has(`${instructor.id}-contact`)}
            onToggle={onToggleRow}
          />
        </div>
      </div>
    </div>
  );
}
