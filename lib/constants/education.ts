/**
 * lib/constants/education.ts — Domain constants for the Abacus Portal.
 *
 * Centralising these prevents duplicate definitions across student/CI modals
 * and makes future changes a one-liner.
 *
 * Usage:
 *   import { STANDARDS, BLOOD_GROUPS, STUDENT_FORM_STEPS } from "@/lib/constants/education";
 */

import { BloodGroup } from "@/services/franchise.enums";
import type { StepDef } from "@/components/shared/stepper";

// ---------------------------------------------------------------------------
// Academic standards (school grades)
// ---------------------------------------------------------------------------

/**
 * Ordered list of school standards used in student and CI registration forms.
 *
 * Pre-KG through 12th, matching the values expected by the backend.
 */
export const STANDARDS = [
  "Pre-KG",
  "LKG",
  "UKG",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
] as const;

export type StandardValue = (typeof STANDARDS)[number];

// ---------------------------------------------------------------------------
// Blood groups
// ---------------------------------------------------------------------------

/**
 * Complete list of ABO+Rh blood groups, sourced from the `BloodGroup` enum.
 *
 * Useful for `<Select>` options — avoids calling `Object.values(BloodGroup)`
 * (which is not order-guaranteed for TS enums at runtime).
 */
const BLOOD_GROUPS: BloodGroup[] = [
  BloodGroup.A_POSITIVE,
  BloodGroup.A_NEGATIVE,
  BloodGroup.B_POSITIVE,
  BloodGroup.B_NEGATIVE,
  BloodGroup.AB_POSITIVE,
  BloodGroup.AB_NEGATIVE,
  BloodGroup.O_POSITIVE,
  BloodGroup.O_NEGATIVE,
];

// ---------------------------------------------------------------------------
// Multi-step form step definitions
// ---------------------------------------------------------------------------

/**
 * Step definitions for the Add Student multi-step dialog.
 *
 * Used by `AddStudentModal` and `EditStudentModal`.
 */
const STUDENT_FORM_STEPS: StepDef[] = [
  { id: 1, title: "Basic Information" },
  { id: 2, title: "Parent Details" },
  { id: 3, title: "Contact & Address" },
  { id: 4, title: "Academic Details" },
];

/**
 * Step definitions for the Add/Setup Course Instructor multi-step dialog.
 *
 * Used by `AddCourseInstructorModal` and `SetupExistingCIDialog`.
 */
const CI_FORM_STEPS: StepDef[] = [
  { id: 1, title: "Basic Information" },
  { id: 2, title: "Personal Details" },
  { id: 3, title: "Contact & Address" },
  { id: 4, title: "Professional Details" },
];

/**
 * Step definitions for the Create Franchise multi-step dialog.
 *
 * Used by `CreateFranchiseDialog`.
 */
const FRANCHISE_FORM_STEPS: StepDef[] = [
  { id: 1, title: "Basic Information" },
  { id: 2, title: "Owner Details" },
  { id: 3, title: "Agreement" },
  { id: 4, title: "Review & Submit" },
];
