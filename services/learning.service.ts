import { api } from "@/lib/axios";
import { unwrapData, unwrapList } from "@/lib/unwrap-api";

export interface LearningBookChapter {
  id?: number;
  title: string;
  pageFrom: number;
  pageTo: number;
  sortOrder?: number;
}

export interface LearningBook {
  id: number;
  title: string;
  programId: number;
  programName?: string | null;
  programCode?: string | null;
  levelId: number;
  levelName?: string | null;
  levelCode?: string | null;
  subject: string;
  totalPages: number;
  description?: string | null;
  isActive: boolean;
  chapters: LearningBookChapter[];
}

export interface LearningBatch {
  id: number;
  franchiseId: string;
  name: string;
  levelId?: number | null;
  levelName?: string | null;
  coordinatorInstructorId?: number | null;
  isActive: boolean;
  studentIds: number[];
  students: Array<{ id: number; name: string; rollNo: string; levelId: number }>;
  studentCount: number;
}

export interface LearningAssignment {
  id: number;
  franchiseId: string;
  bookId: number;
  bookTitle?: string | null;
  bookSubject?: string | null;
  bookTotalPages?: number | null;
  chapterId?: number | null;
  pageFrom: number;
  pageTo: number;
  targetType: "INDIVIDUAL" | "BATCH";
  batchId?: number | null;
  assignedDate: string;
  dueDate: string;
  instructions?: string | null;
  priority: "NORMAL" | "IMPORTANT";
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
  completionSummary: string;
  students: Array<{
    id: number;
    studentId: number;
    studentName?: string | null;
    studentRollNo?: string | null;
    status: "PENDING" | "COMPLETED";
    completedAt?: string | null;
  }>;
}

export interface LearningProgressRow {
  assignmentId: number;
  franchiseId?: string;
  studentId: number;
  studentName?: string | null;
  studentRollNo?: string | null;
  bookTitle?: string | null;
  pages: string;
  assignedDate: string;
  dueDate: string;
  status: "PENDING" | "COMPLETED";
  assignmentStatus: string;
  priority: string;
}

export async function fetchAdminBooks(includeInactive = true) {
  const response = await api.get("/learning/admin/books", {
    params: { includeInactive: includeInactive ? "true" : "false" },
  });
  return unwrapList<LearningBook>(response);
}

export async function createAdminBook(payload: Partial<LearningBook>) {
  const response = await api.post("/learning/admin/books", payload);
  return unwrapData<LearningBook>(response);
}

export async function updateAdminBook(id: number, payload: Partial<LearningBook>) {
  const response = await api.put(`/learning/admin/books/${id}`, payload);
  return unwrapData<LearningBook>(response);
}

export async function deactivateAdminBook(id: number) {
  const response = await api.patch(`/learning/admin/books/${id}/deactivate`);
  return unwrapData(response);
}

export async function activateAdminBook(id: number) {
  const response = await api.patch(`/learning/admin/books/${id}/activate`);
  return unwrapData(response);
}

export async function deleteAdminBook(id: number) {
  const response = await api.delete(`/learning/admin/books/${id}`);
  return unwrapData(response);
}

export async function fetchAdminLearningProgress(params?: {
  franchiseId?: string;
  status?: string;
}) {
  const response = await api.get("/learning/admin/books/progress", { params });
  return unwrapList<LearningProgressRow>(response);
}

export async function fetchFranchiseBooks(params?: {
  levelId?: number;
  search?: string;
}) {
  const response = await api.get("/learning/franchise/books", { params });
  return unwrapList<LearningBook>(response);
}

export async function fetchFranchiseBatches(activeOnly = false) {
  const response = await api.get("/learning/franchise/batches", {
    params: { activeOnly: activeOnly ? "true" : "false" },
  });
  return unwrapList<LearningBatch>(response);
}

export async function createFranchiseBatch(payload: {
  name: string;
  levelId?: number;
  coordinatorInstructorId?: number;
  studentIds: number[];
}) {
  const response = await api.post("/learning/franchise/batches", payload);
  return unwrapData<LearningBatch>(response);
}

export async function updateFranchiseBatch(
  id: number,
  payload: {
    name: string;
    levelId?: number;
    coordinatorInstructorId?: number;
    studentIds: number[];
  },
) {
  const response = await api.put(`/learning/franchise/batches/${id}`, payload);
  return unwrapData<LearningBatch>(response);
}

export async function deactivateFranchiseBatch(id: number) {
  const response = await api.patch(`/learning/franchise/batches/${id}/deactivate`);
  return unwrapData(response);
}

export async function deleteFranchiseBatch(id: number) {
  const response = await api.delete(`/learning/franchise/batches/${id}`);
  return unwrapData(response);
}

export async function fetchFranchiseAssignments(params?: {
  status?: string;
  bookId?: number;
  studentId?: number;
  batchId?: number;
}) {
  const response = await api.get("/learning/franchise/assignments", { params });
  return unwrapList<LearningAssignment>(response);
}

export async function createFranchiseAssignment(payload: {
  bookId: number;
  chapterId?: number;
  pageFrom: number;
  pageTo: number;
  targetType: "INDIVIDUAL" | "BATCH";
  batchId?: number;
  studentIds: number[];
  assignedDate: string;
  dueDate: string;
  instructions?: string;
  priority?: "NORMAL" | "IMPORTANT";
}) {
  const response = await api.post("/learning/franchise/assignments", payload);
  return unwrapData<LearningAssignment>(response);
}

export async function cancelFranchiseAssignment(id: number) {
  const response = await api.patch(`/learning/franchise/assignments/${id}/cancel`);
  return unwrapData<LearningAssignment>(response);
}

export async function deleteFranchiseAssignment(id: number) {
  const response = await api.delete(`/learning/franchise/assignments/${id}`);
  return unwrapData(response);
}

export async function markAssignmentStudentComplete(
  assignmentId: number,
  studentId: number,
) {
  const response = await api.patch(
    `/learning/franchise/assignments/${assignmentId}/students/${studentId}/complete`,
  );
  return unwrapData<LearningAssignment>(response);
}

export async function fetchFranchiseLearningProgress(studentId?: number) {
  const response = await api.get("/learning/franchise/assignments/progress", {
    params: studentId ? { studentId } : undefined,
  });
  return unwrapList<LearningProgressRow>(response);
}

// ── Class Schedule & Attendance Types & Services ──────────────────────────────

export interface SessionAttendanceRoster {
  studentId: number;
  studentName: string;
  studentRollNo: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  remarks?: string | null;
}

export interface ClassSession {
  id: number;
  batchId?: number | null;
  batchName: string;
  subject: string;
  dayOfWeek: string;
  date: string;
  startTime: string;
  endTime: string;
  roomNo: string;
  instructorName: string;
  isAttendanceMarked: boolean;
  roster: SessionAttendanceRoster[];
}

const SESSIONS_STORAGE_KEY = "franchise_class_sessions_v1";

function getStoredClassSessions(): ClassSession[] {
  if (typeof window === "undefined") return MOCK_CLASS_SESSIONS;
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(MOCK_CLASS_SESSIONS));
      return MOCK_CLASS_SESSIONS;
    }
    return JSON.parse(raw) as ClassSession[];
  } catch {
    return MOCK_CLASS_SESSIONS;
  }
}

function saveStoredClassSessions(sessions: ClassSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* ignore storage write error */
  }
}

export async function fetchFranchiseClassSessions(day?: string) {
  try {
    const response = await api.get("/learning/franchise/sessions", {
      params: day && day !== "All" ? { day } : undefined,
    });
    return unwrapList<ClassSession>(response);
  } catch {
    const sessions = getStoredClassSessions();
    return sessions.filter((s) => !day || day === "All" || s.dayOfWeek === day);
  }
}

export async function createFranchiseClassSession(payload: {
  batchName: string;
  subject: string;
  dayOfWeek: string;
  date: string;
  startTime: string;
  endTime: string;
  roomNo: string;
  instructorName: string;
  roster?: SessionAttendanceRoster[];
}) {
  try {
    const response = await api.post("/learning/franchise/sessions", payload);
    return unwrapData<ClassSession>(response);
  } catch {
    const sessions = getStoredClassSessions();
    const newSession: ClassSession = {
      id: Date.now(),
      batchName: payload.batchName,
      subject: payload.subject,
      dayOfWeek: payload.dayOfWeek,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      roomNo: payload.roomNo,
      instructorName: payload.instructorName,
      isAttendanceMarked: false,
      roster: payload.roster && payload.roster.length > 0 ? payload.roster : [
        { studentId: 101, studentName: "Arjun Kumar", studentRollNo: "IPA2023-01", status: "PRESENT" },
        { studentId: 102, studentName: "Rohan Sharma", studentRollNo: "IPA2023-02", status: "PRESENT" },
        { studentId: 103, studentName: "Priya Dharshini", studentRollNo: "IPA2023-03", status: "PRESENT" },
        { studentId: 104, studentName: "Karthik Raja", studentRollNo: "IPA2023-04", status: "PRESENT" },
      ],
    };
    sessions.unshift(newSession);
    saveStoredClassSessions(sessions);
    return newSession;
  }
}

export async function saveFranchiseSessionAttendance(
  sessionId: number,
  roster: SessionAttendanceRoster[],
) {
  try {
    const response = await api.put(`/learning/franchise/sessions/${sessionId}/attendance`, { roster });
    return unwrapData<ClassSession>(response);
  } catch {
    const sessions = getStoredClassSessions();
    const match = sessions.find((s) => String(s.id) === String(sessionId));
    if (match) {
      match.isAttendanceMarked = true;
      match.roster = roster;
      saveStoredClassSessions(sessions);
    }
    return match;
  }
}

export async function updateFranchiseClassSession(
  sessionId: number,
  payload: Partial<ClassSession>,
) {
  try {
    const response = await api.put(`/learning/franchise/sessions/${sessionId}`, payload);
    return unwrapData<ClassSession>(response);
  } catch {
    const sessions = getStoredClassSessions();
    const index = sessions.findIndex((s) => String(s.id) === String(sessionId));
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...payload };
      saveStoredClassSessions(sessions);
      return sessions[index];
    }
    return null;
  }
}

export async function deleteFranchiseClassSession(sessionId: number) {
  try {
    const response = await api.delete(`/learning/franchise/sessions/${sessionId}`);
    return unwrapData<{ success: boolean }>(response);
  } catch {
    const sessions = getStoredClassSessions();
    const filtered = sessions.filter((s) => String(s.id) !== String(sessionId));
    saveStoredClassSessions(filtered);
    return { success: true };
  }
}



const MOCK_CLASS_SESSIONS: ClassSession[] = [
  {
    id: 1,
    batchName: "Batch A – Level 4",
    subject: "Abacus Level 4",
    dayOfWeek: "Mon",
    date: "2026-09-01",
    startTime: "17:00",
    endTime: "18:00",
    roomNo: "Room 102",
    instructorName: "Mrs. S. Meenakshi",
    isAttendanceMarked: true,
    roster: [
      { studentId: 101, studentName: "Arjun Kumar", studentRollNo: "IPA2023-01", status: "PRESENT" },
      { studentId: 102, studentName: "Rohan Sharma", studentRollNo: "IPA2023-02", status: "PRESENT" },
      { studentId: 103, studentName: "Priya Dharshini", studentRollNo: "IPA2023-03", status: "ABSENT" },
      { studentId: 104, studentName: "Karthik Raja", studentRollNo: "IPA2023-04", status: "PRESENT" },
      { studentId: 105, studentName: "Ananya V", studentRollNo: "IPA2023-05", status: "LEAVE" },
    ],
  },
  {
    id: 2,
    batchName: "Batch B – Mental Math",
    subject: "Mental Speed Drills",
    dayOfWeek: "Mon",
    date: "2026-09-01",
    startTime: "18:15",
    endTime: "19:15",
    roomNo: "Lab B",
    instructorName: "Mr. Rajesh K",
    isAttendanceMarked: false,
    roster: [
      { studentId: 106, studentName: "Siddharth M", studentRollNo: "IPA2023-06", status: "PRESENT" },
      { studentId: 107, studentName: "Kavya S", studentRollNo: "IPA2023-07", status: "PRESENT" },
      { studentId: 108, studentName: "Nivin P", studentRollNo: "IPA2023-08", status: "PRESENT" },
    ],
  },
  {
    id: 3,
    batchName: "Batch A – Level 4",
    subject: "Abacus Speed Test & Practice",
    dayOfWeek: "Wed",
    date: "2026-09-03",
    startTime: "17:00",
    endTime: "18:00",
    roomNo: "Room 102",
    instructorName: "Mrs. S. Meenakshi",
    isAttendanceMarked: false,
    roster: [
      { studentId: 101, studentName: "Arjun Kumar", studentRollNo: "IPA2023-01", status: "PRESENT" },
      { studentId: 102, studentName: "Rohan Sharma", studentRollNo: "IPA2023-02", status: "PRESENT" },
      { studentId: 103, studentName: "Priya Dharshini", studentRollNo: "IPA2023-03", status: "PRESENT" },
    ],
  },
];

