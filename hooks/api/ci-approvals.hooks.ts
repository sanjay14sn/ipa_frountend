"use client";

import {
  approveCourseInstructor,
  rejectCourseInstructor,
  type ApproveCourseInstructorRequest,
} from "@/services/course-instructor.service";
import { getQueryClientBridge } from "@/hooks/api/query-client-bridge";

const CI_LIST_PREFIX = ["course-instructors", "list"] as const;

export async function approveCourseInstructorWithRevalidation(
  id: number,
  body: ApproveCourseInstructorRequest,
) {
  const r = await approveCourseInstructor(id, body);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
  } catch {
    /* ignore */
  }
  return r;
}

export async function rejectCourseInstructorWithRevalidation(id: number) {
  const r = await rejectCourseInstructor(id);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
  } catch {
    /* ignore */
  }
  return r;
}
