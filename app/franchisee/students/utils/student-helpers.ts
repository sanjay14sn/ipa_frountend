import { StudentData } from "@/services/student.service";

/**
 * Extracts the level code from student data
 * Handles both string format (legacy) and object format (with level association)
 */
export function getStudentLevelName(student: StudentData): string {
  if (typeof student.level === 'object' && student.level !== null) {
    // Prefer code over name if available
    if ('code' in student.level && student.level.code) {
      return student.level.code;
    }
    if ('name' in student.level && student.level.name) {
      return student.level.name;
    }
  }
  if (typeof student.level === 'string') {
    return student.level;
  }
  return 'N/A';
}

/**
 * Gets level name for filtering/comparison
 */
function getStudentLevelForFilter(student: StudentData): string {
  return getStudentLevelName(student);
}

