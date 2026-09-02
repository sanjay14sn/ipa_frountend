"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Building2,
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid,
  List,
  Pencil,
  Plus,
  PlusCircle,
  Save,
  Search,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DataTable,
  PageSkeleton,
  RowActionButton,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
} from "@/components/shared";
import { useStudents } from "@/hooks/api/student.hooks";
import {
  createFranchiseClassSession,
  deleteFranchiseClassSession,
  fetchFranchiseBatches,
  fetchFranchiseClassSessions,
  saveFranchiseSessionAttendance,
  updateFranchiseClassSession,
  type ClassSession,
  type LearningBatch,
  type SessionAttendanceRoster,
} from "@/services/learning.service";

const DAYS = ["All", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Dedicated Paginated Dialog for Selecting Real Franchise Students
 */
function SelectStudentsDialog({
  open,
  onOpenChange,
  selectedStudentIds,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudentIds: number[];
  onConfirm: (selectedIds: number[], selectedRoster: SessionAttendanceRoster[]) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [search, setSearch] = useState("");
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>(selectedStudentIds);

  const { students: allStudents = [] } = useStudents();

  // Master list of real franchise students
  const masterStudents = useMemo(() => {
    if (allStudents.length > 0) {
      return allStudents.map((s) => ({
        id: s.id,
        name: s.name,
        rollNo: s.rollNo || `ST/AB/772/0000${s.id}`,
      }));
    }

    return [
      { id: 103, name: "Hidden Student Three", rollNo: "ST/AB/772/00003" },
      { id: 102, name: "Hidden Student Two", rollNo: "ST/AB/772/00002" },
      { id: 101, name: "Hidden Student One", rollNo: "ST/AB/772/00001" },
    ];
  }, [allStudents]);

  // Sync temp selected IDs when dialog opens
  useEffect(() => {
    if (open) {
      const masterIds = new Set(masterStudents.map((s) => s.id));
      const syncedIds: number[] = [];
      for (const id of selectedStudentIds) {
        if (masterIds.has(id)) {
          syncedIds.push(id);
        }
      }

      // If mock IDs were passed that don't match DB primary keys, select all master students matching initial count
      if (syncedIds.length === 0 && selectedStudentIds.length > 0) {
        for (const s of masterStudents) {
          syncedIds.push(s.id);
        }
      }

      setTempSelectedIds(syncedIds);
    }
  }, [open, selectedStudentIds, masterStudents]);

  // Search filtering
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return masterStudents;
    const q = search.toLowerCase();
    return masterStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q),
    );
  }, [masterStudents, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPageStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, page, pageSize]);

  const toggleSelect = (id: number) => {
    setTempSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleApply = () => {
    const selectedRoster: SessionAttendanceRoster[] = masterStudents
      .filter((s) => tempSelectedIds.includes(s.id))
      .map((s) => ({
        studentId: s.id,
        studentName: s.name,
        studentRollNo: s.rollNo,
        status: "PRESENT",
      }));
    onConfirm(tempSelectedIds, selectedRoster);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold text-gray-900">
            Select Real Students Enrolled in Franchise
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Search, filter, and pick enrolled students with pagination.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative pt-2">
          <Search className="absolute left-3 top-5 h-4 w-4 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            placeholder="Search student by name or roll number (e.g. ST/AB/772)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Paginated Student Rows */}
        <div className="space-y-2.5 py-2">
          {currentPageStudents.map((st) => {
            const isChecked = tempSelectedIds.includes(st.id);
            return (
              <div
                key={st.id}
                onClick={() => toggleSelect(st.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isChecked
                    ? "border-indigo-500 bg-indigo-50/40 shadow-xs"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // handled by parent div
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900">{st.name}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">{st.rollNo}</div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    isChecked
                      ? "bg-indigo-600 text-white border-indigo-600 text-[10px]"
                      : "bg-gray-100 text-gray-500 border-gray-200 text-[10px]"
                  }
                >
                  {isChecked ? "Selected" : "Select"}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t pt-3 text-xs text-gray-500">
          <div>
            Showing <span className="font-semibold text-gray-900">{currentPageStudents.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{filteredStudents.length}</span> Students
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-lg"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="font-semibold text-gray-700">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-lg"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <div className="text-xs font-semibold text-indigo-600">
            {tempSelectedIds.length} Students Selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              onClick={handleApply}
            >
              Apply Selected Students
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatToDDMMYYYY(dStr: string) {
  if (!dStr) return getTodayDDMMYYYY();
  if (dStr.includes("-")) {
    const parts = dStr.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dStr;
}

function getTodayDDMMYYYY(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function normalizeDateISO(dStr: string): string {
  if (!dStr) return "";
  const cleaned = dStr.trim();
  if (cleaned.includes("-")) {
    const parts = cleaned.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
  } else if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
  }
  return dStr;
}

function formatTime12h(timeStr: string): string {
  if (!timeStr) return "05:00 PM";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, "0");
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

function parseTo24h(tStr: string): string {
  if (!tStr) return "17:00";
  const cleaned = tStr.trim();
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    let hours = parseInt(parts[0], 10);
    const minsMatch = parts[1].match(/\d+/);
    const minutes = minsMatch ? minsMatch[0].padStart(2, "0") : "00";
    if (cleaned.toUpperCase().includes("PM") && hours < 12) hours += 12;
    if (cleaned.toUpperCase().includes("AM") && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  return tStr;
}

function getDayAbbrFromDate(dateStr?: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (dateStr) {
    let year: number, month: number, day: number;
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else if (parts[2].length === 4) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      } else {
        return days[new Date().getDay()];
      }
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return days[d.getDay()];
      }
    }
  }
  return days[new Date().getDay()];
}

function ScheduleDialog({
  open,
  onOpenChange,
  onSaved,
  initialSession,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialSession?: ClassSession | null;
}) {
  const { data: batches = [] } = useQuery({
    queryKey: ["franchise-learning-batches"],
    queryFn: () => fetchFranchiseBatches(true),
  });

  const { students: realFranchiseStudents = [] } = useStudents();

  const [selectionMode, setSelectionMode] = useState<"BATCH" | "INDIVIDUAL">("BATCH");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("default_a");
  const [batchName, setBatchName] = useState("Batch A – Level 4");
  const [subject, setSubject] = useState("Abacus Practice & Logic");
  const [dayOfWeek, setDayOfWeek] = useState(() => getDayAbbrFromDate());
  const [date, setDate] = useState(() => getTodayDDMMYYYY());
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:00");
  const [roomNo, setRoomNo] = useState("Room 101");
  const [instructorName, setInstructorName] = useState("Mrs. S. Meenakshi");

  const [selectStudentsOpen, setSelectStudentsOpen] = useState(false);
  const [customSelectedStudentIds, setCustomSelectedStudentIds] = useState<number[]>([103, 102, 101]);
  const [customRoster, setCustomRoster] = useState<SessionAttendanceRoster[] | null>(null);

  const searchParams = useSearchParams();
  const queryBatchId = searchParams.get("batchId");
  const queryBatchName = searchParams.get("batchName");

  const initialSessionId = initialSession?.id;
  const firstBatchId = batches[0]?.id;
  const firstBatchName = batches[0]?.name;

  // Pre-fill state when editing an existing session
  useEffect(() => {
    if (open) {
      if (initialSession) {
        setSubject(initialSession.subject);
        setBatchName(initialSession.batchName);
        setDayOfWeek(initialSession.dayOfWeek);
        setDate(formatToDDMMYYYY(initialSession.date));
        const rawStart = initialSession.startTime ? initialSession.startTime.split(" - ")[0] : "17:00";
        const rawEnd = initialSession.endTime || (initialSession.startTime ? initialSession.startTime.split(" - ")[1] : "18:00");
        setStartTime(parseTo24h(rawStart));
        setEndTime(parseTo24h(rawEnd));
        setRoomNo(initialSession.roomNo);
        setInstructorName(initialSession.instructorName);
        setCustomRoster(initialSession.roster);
        setCustomSelectedStudentIds(initialSession.roster.map((r) => r.studentId));
        if (
          initialSession.batchId ||
          (initialSession.batchName && initialSession.batchName.toLowerCase().includes("batch"))
        ) {
          setSelectionMode("BATCH");
        } else {
          setSelectionMode("INDIVIDUAL");
        }
      } else {
        const todayDate = getTodayDDMMYYYY();
        setSubject("Abacus Practice & Logic");
        setDate(todayDate);
        setDayOfWeek(getDayAbbrFromDate(todayDate));
        setStartTime("17:00");
        setEndTime("18:00");
        setRoomNo("Room 101");
        setInstructorName("Mrs. S. Meenakshi");
        setCustomRoster(null);
        setCustomSelectedStudentIds([103, 102, 101]);
        setSelectionMode("BATCH");
        setRoomNo("Room 101");
        setInstructorName("Mrs. S. Meenakshi");
        setCustomRoster(null);
        setCustomSelectedStudentIds([103, 102, 101]);
        setSelectionMode("BATCH");
        if (queryBatchId && queryBatchName) {
          setSelectedBatchId(queryBatchId);
          setBatchName(decodeURIComponent(queryBatchName));
        } else if (firstBatchId && firstBatchName) {
          setSelectedBatchId(String(firstBatchId));
          setBatchName(firstBatchName);
        } else {
          setSelectedBatchId("default_a");
          setBatchName("Batch A – Level 4");
        }
      }
    }
  }, [open, initialSessionId, firstBatchId, firstBatchName, queryBatchId, queryBatchName]);

  // Determine roster for the selected batch
  const selectedBatch = useMemo(
    () => batches.find((b) => String(b.id) === selectedBatchId),
    [batches, selectedBatchId],
  );

  // Automatically calculate roster based on selectionMode
  const batchRoster: SessionAttendanceRoster[] = useMemo(() => {
    // 1. If custom roster picked via sub-page (even if 0 selected)
    if (customRoster !== null) {
      return customRoster;
    }

    if (selectionMode === "BATCH") {
      // 2. If selectedBatch has embedded students list from batch module
      if (selectedBatch && selectedBatch.students && selectedBatch.students.length > 0) {
        return selectedBatch.students.map((s) => ({
          studentId: s.id,
          studentName: s.name,
          studentRollNo: s.rollNo,
          status: "PRESENT",
        }));
      }

      // Default mock students matching user batch mockup
      return [
        { studentId: 103, studentName: "Hidden Student Three", studentRollNo: "ST/AB/772/00003", status: "PRESENT" },
        { studentId: 102, studentName: "Hidden Student Two", studentRollNo: "ST/AB/772/00002", status: "PRESENT" },
        { studentId: 101, studentName: "Hidden Student One", studentRollNo: "ST/AB/772/00001", status: "PRESENT" },
      ];
    } else {
      // INDIVIDUAL mode: filter matching customSelectedStudentIds from real franchise students
      if (realFranchiseStudents.length > 0 && customSelectedStudentIds.length > 0) {
        const selected = realFranchiseStudents.filter((s) => customSelectedStudentIds.includes(s.id));
        if (selected.length > 0) {
          return selected.map((s) => ({
            studentId: s.id,
            studentName: s.name,
            studentRollNo: s.rollNo || `ST/AB/772/0000${s.id}`,
            status: "PRESENT",
          }));
        }
      }

      return [
        { studentId: 103, studentName: "Hidden Student Three", studentRollNo: "ST/AB/772/00003", status: "PRESENT" },
        { studentId: 102, studentName: "Hidden Student Two", studentRollNo: "ST/AB/772/00002", status: "PRESENT" },
        { studentId: 101, studentName: "Hidden Student One", studentRollNo: "ST/AB/772/00001", status: "PRESENT" },
      ];
    }
  }, [selectionMode, selectedBatch, customRoster, customSelectedStudentIds, realFranchiseStudents]);

  const handleBatchChange = (val: string) => {
    setSelectedBatchId(val);
    setCustomRoster(null);
    const found = batches.find((b) => String(b.id) === val);
    if (found) {
      setBatchName(found.name);
    } else {
      setBatchName(val);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const finalBatchName = selectionMode === "BATCH" ? batchName : (batchName.trim() || "Individual Selection");
      const isoDate = normalizeDateISO(date);
      const displayStart = formatTime12h(startTime);
      const displayEnd = formatTime12h(endTime);
      const formattedTimeRange = `${displayStart} - ${displayEnd}`;
      return initialSession
        ? updateFranchiseClassSession(initialSession.id, {
            batchName: finalBatchName,
            subject,
            dayOfWeek,
            date: isoDate,
            startTime: formattedTimeRange,
            endTime: displayEnd,
            roomNo,
            instructorName,
            roster: batchRoster,
          })
        : createFranchiseClassSession({
            batchName: finalBatchName,
            subject,
            dayOfWeek,
            date: isoDate,
            startTime: formattedTimeRange,
            endTime: displayEnd,
            roomNo,
            instructorName,
            roster: batchRoster,
          });
    },
    onSuccess: () => {
      toast.success(initialSession ? "Class Schedule Updated successfully!" : "Class Session Scheduled successfully!");
      onSaved();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to schedule class"),
  });

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return "ST";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-2xl border-none shadow-2xl">
          {/* Custom Header Bar */}
          <div className="flex items-start justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-accent"
                onClick={() => onOpenChange(false)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
                  Schedule New Class
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Fill in the details below to schedule a new class.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-accent"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6 pt-4">
            {/* Student Selection Option Switcher (Batch-Wise vs Individual) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Student Selection Mode *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode("BATCH");
                    setCustomRoster(null);
                  }}
                  className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-xs font-bold transition-all ${
                    selectionMode === "BATCH"
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-xs ring-2 ring-indigo-500/20"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Users className={`h-4 w-4 ${selectionMode === "BATCH" ? "text-indigo-600" : "text-gray-400"}`} />
                  <div className="text-left">
                    <div>Batch Wise Selection</div>
                    <div className="text-[10px] font-normal text-gray-500">Pick from existing student batches</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode("INDIVIDUAL");
                    setCustomRoster(null);
                  }}
                  className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-xs font-bold transition-all ${
                    selectionMode === "INDIVIDUAL"
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-xs ring-2 ring-indigo-500/20"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <UserCheck className={`h-4 w-4 ${selectionMode === "INDIVIDUAL" ? "text-indigo-600" : "text-gray-400"}`} />
                  <div className="text-left">
                    <div>Individual Selection</div>
                    <div className="text-[10px] font-normal text-gray-500">Pick specific individual students</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Row 1: Subject Name & Batch Name / Group Label */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">Subject Name *</Label>
                <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                  <div className="p-3 text-indigo-600 bg-indigo-50/60 border-r border-gray-100 rounded-l-xl">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <input
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Abacus Practice & Logic"
                  />
                </div>
              </div>

              {selectionMode === "BATCH" ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Batch Name (Batch Module) *</Label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="p-3 text-indigo-600 bg-indigo-50/60 border-r border-gray-100 rounded-l-xl">
                      <Users className="h-4 w-4" />
                    </div>
                    <select
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none appearance-none cursor-pointer"
                      value={selectedBatchId}
                      onChange={(e) => handleBatchChange(e.target.value)}
                    >
                      {batches.length > 0 ? (
                        batches.map((b) => (
                          <option key={b.id} value={String(b.id)}>
                            {b.name} ({b.studentCount ?? b.studentIds?.length ?? 0} Students)
                          </option>
                        ))
                      ) : (
                        <option value="default_a">Batch A – Level 4 (3 Students)</option>
                      )}
                    </select>
                    <ChevronDown className="h-4 w-4 text-gray-400 mr-3 pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Class / Group Label (Individual Mode)</Label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="p-3 text-indigo-600 bg-indigo-50/60 border-r border-gray-100 rounded-l-xl">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <input
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="e.g. Individual Selected Group"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Enrolled / Selected Students Card Section - ONLY SHOWN IN INDIVIDUAL MODE */}
            {selectionMode === "INDIVIDUAL" && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Selected Individual Students</h4>
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5">{batchRoster.length} Students</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-semibold text-xs px-3.5 py-2 shadow-xs transition-colors"
                    onClick={() => setSelectStudentsOpen(true)}
                  >
                    + Pick Real Students
                  </Button>
                </div>

                {/* Rendered Student Cards */}
                {batchRoster.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-gray-200 rounded-xl bg-white space-y-2">
                    <p>No students selected for this schedule.</p>
                    <Button
                      type="button"
                      variant="link"
                      className="text-indigo-600 text-xs font-semibold p-0 h-auto"
                      onClick={() => setSelectStudentsOpen(true)}
                    >
                      Click &quot;+ Pick Real Students&quot; to pick students
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {batchRoster.map((student) => (
                      <div
                        key={student.studentId}
                        className="flex items-center justify-between bg-white border border-gray-100/90 shadow-sm rounded-xl p-3.5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(student.studentName)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{student.studentName}</span>
                            <span className="text-xs font-normal text-gray-400">({student.studentRollNo})</span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-600 border-emerald-200/80 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" /> Enrolled
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Class Details Grid Container */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/40 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Day</Label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <div className="p-3 text-indigo-600 bg-indigo-50/60 border-r border-gray-100 rounded-l-xl">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <select
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none appearance-none cursor-pointer"
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(e.target.value)}
                    >
                      <option value="Tue">Tuesday</option>
                      <option value="Mon">Monday</option>
                      <option value="Wed">Wednesday</option>
                      <option value="Thu">Thursday</option>
                      <option value="Fri">Friday</option>
                      <option value="Sat">Saturday</option>
                      <option value="Sun">Sunday</option>
                    </select>
                    <ChevronDown className="h-4 w-4 text-gray-400 mr-3 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Date (DD-MM-YYYY) *</Label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <div className="p-3 text-indigo-600 bg-indigo-50/60 border-r border-gray-100 rounded-l-xl">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none"
                      value={date}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDate(val);
                        const matchedDay = getDayAbbrFromDate(val);
                        if (matchedDay) setDayOfWeek(matchedDay);
                      }}
                      placeholder="DD-MM-YYYY"
                    />
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Dynamic Start Time & End Time Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Start Time *</Label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <div className="p-3 text-indigo-600 bg-indigo-50/60 border-r border-gray-100 rounded-l-xl">
                      <Clock className="h-4 w-4" />
                    </div>
                    <input
                      type="time"
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none cursor-pointer"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">End Time *</Label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <div className="p-3 text-indigo-600 bg-indigo-50/60 border-r border-gray-100 rounded-l-xl">
                      <Clock className="h-4 w-4" />
                    </div>
                    <input
                      type="time"
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none cursor-pointer"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Room / Hall</Label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <div className="p-3 text-indigo-600 bg-indigo-50/60 border-r border-gray-100 rounded-l-xl">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <select
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none appearance-none cursor-pointer"
                      value={roomNo}
                      onChange={(e) => setRoomNo(e.target.value)}
                    >
                      <option value="Room 101">Room 101</option>
                      <option value="Room 102">Room 102</option>
                      <option value="Main Hall">Main Hall</option>
                      <option value="Lab B">Lab B</option>
                    </select>
                    <ChevronDown className="h-4 w-4 text-gray-400 mr-3 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Instructor</Label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <div className="p-3 text-indigo-600 bg-indigo-50/60 border-r border-gray-100 rounded-l-xl">
                      <User className="h-4 w-4" />
                    </div>
                    <select
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none appearance-none cursor-pointer"
                      value={instructorName}
                      onChange={(e) => setInstructorName(e.target.value)}
                    >
                      <option value="Mrs. S. Meenakshi">Mrs. S. Meenakshi</option>
                      <option value="Mr. Rajesh K">Mr. Rajesh K</option>
                      <option value="Ms. Anitha P">Ms. Anitha P</option>
                    </select>
                    <ChevronDown className="h-4 w-4 text-gray-400 mr-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Class Summary Banner */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <CalendarIcon className="h-4 w-4 text-indigo-600" />
                <span>Class Summary</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs divide-y sm:divide-y-0 sm:divide-x divide-indigo-200/60 pt-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-indigo-950">{batchRoster.length}</div>
                    <div className="text-[10px] text-indigo-600 font-medium">Students</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:pl-3 pt-2 sm:pt-0">
                  <CalendarIcon className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-indigo-950">{dayOfWeek}, {date}</div>
                    <div className="text-[10px] text-indigo-600 font-medium">Date</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:pl-3 pt-2 sm:pt-0">
                  <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-indigo-950">
                      {formatTime12h(startTime)} – {formatTime12h(endTime)}
                    </div>
                    <div className="text-[10px] text-indigo-600 font-medium">Time</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:pl-3 pt-2 sm:pt-0">
                  <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-indigo-950">{roomNo}</div>
                    <div className="text-[10px] text-indigo-600 font-medium">Room / Hall</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:pl-3 pt-2 sm:pt-0">
                  <User className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-indigo-950">{instructorName}</div>
                    <div className="text-[10px] text-indigo-600 font-medium">Instructor</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl px-6 font-semibold border-gray-200 text-gray-700 hover:bg-gray-50"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-7 font-semibold shadow-md flex items-center gap-2 transition-all"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4" /> Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dedicated Paginated Student Selection Dialog */}
      <SelectStudentsDialog
        open={selectStudentsOpen}
        onOpenChange={setSelectStudentsOpen}
        selectedStudentIds={customSelectedStudentIds}
        onConfirm={(ids, roster) => {
          setCustomSelectedStudentIds(ids);
          setCustomRoster(roster);
          toast.success(`${roster.length} real students applied to roster!`);
        }}
      />
    </>
  );
}

function getTodayISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function AttendanceRosterDialog({
  session,
  open,
  onOpenChange,
  onSaved,
}: {
  session: ClassSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [roster, setRoster] = useState<SessionAttendanceRoster[]>(session?.roster ?? []);

  // Update local state when session or open dialog changes
  useEffect(() => {
    if (open && session) {
      setRoster(session.roster);
    }
  }, [open, session]);

  const saveMutation = useMutation({
    mutationFn: () => saveFranchiseSessionAttendance(session!.id, roster),
    onSuccess: () => {
      toast.success("Attendance saved & notification alerts sent to parents!");
      onSaved();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save attendance"),
  });

  if (!session) return null;

  const presentCount = roster.filter((r) => r.status === "PRESENT").length;
  const absentCount = roster.filter((r) => r.status === "ABSENT").length;

  const handleMarkAllPresent = () => {
    setRoster((prev) => prev.map((item) => ({ ...item, status: "PRESENT" })));
  };

  const updateStudentStatus = (studentId: number, status: SessionAttendanceRoster["status"]) => {
    setRoster((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, status } : item)),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Attendance — {session.subject}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {session.batchName} • {session.date} ({session.dayOfWeek}) • {session.startTime}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Present: {presentCount}
            </Badge>
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
              Absent: {absentCount}
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={handleMarkAllPresent}>
            <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Mark All Present
          </Button>
        </div>

        <div className="space-y-3 py-2">
          {roster.map((student) => (
            <div
              key={student.studentId}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
            >
              <div>
                <div className="font-semibold text-sm">{student.studentName}</div>
                <div className="text-xs text-muted-foreground">{student.studentRollNo}</div>
              </div>
              <div className="flex items-center gap-1.5">
                {(["PRESENT", "ABSENT", "LATE", "LEAVE"] as const).map((st) => {
                  const isSelected = student.status === st;
                  let colorClass = "bg-muted text-muted-foreground hover:bg-muted/80";
                  if (isSelected) {
                    if (st === "PRESENT") colorClass = "bg-emerald-600 text-white font-bold";
                    if (st === "ABSENT") colorClass = "bg-rose-600 text-white font-bold";
                    if (st === "LATE") colorClass = "bg-amber-500 text-white font-bold";
                    if (st === "LEAVE") colorClass = "bg-purple-600 text-white font-bold";
                  }

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateStudentStatus(student.studentId, st)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${colorClass}`}
                    >
                      {st[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Save & Notify Parents
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * International Premium Interactive Calendar View Component
 */
function FranchiseCalendarView({
  sessions,
  onMarkAttendance,
  onEditSchedule,
  onDeleteSchedule,
  onScheduleForDate,
}: {
  sessions: ClassSession[];
  onMarkAttendance: (session: ClassSession) => void;
  onEditSchedule: (session: ClassSession) => void;
  onDeleteSchedule: (sessionId: number, subject: string, batch: string) => void;
  onScheduleForDate: (dateStr: string) => void;
}) {
  const todayISO = getTodayISO();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getTodayISO());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const prevDate = daysInPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(prevDate).padStart(2, "0")}`;
      days.push({ dayNum: prevDate, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ dayNum: i, dateStr, isCurrentMonth: true });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ dayNum: i, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  // Map sessions by date string (YYYY-MM-DD)
  const sessionsByDate = useMemo(() => {
    const map: Record<string, ClassSession[]> = {};
    for (const s of sessions) {
      const d = normalizeDateISO(s.date);
      if (!map[d]) map[d] = [];
      map[d].push(s);
    }
    return map;
  }, [sessions]);

  const selectedDateSessions = sessionsByDate[normalizeDateISO(selectedDateStr)] || [];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(getTodayISO());
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 flex items-center justify-center font-bold">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {monthNames[month]} {year}
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-semibold">
                {sessions.length} Scheduled Sessions
              </Badge>
            </h3>
            <p className="text-xs text-gray-500">Interactive monthly timetable calendar view</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="rounded-xl text-xs font-semibold">
            Today
          </Button>
          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50/50 p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs font-bold text-gray-700 min-w-[100px] text-center">
              {monthNames[month].slice(0, 3)} {year}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid & Selected Day Drawer Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Monthly Calendar Grid (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-1 border-b border-gray-100 pb-2 text-center">
            {dayNames.map((d) => (
              <div key={d} className="text-[11px] font-bold text-gray-400 tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* 35/42 Cell Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 min-h-[440px]">
            {calendarDays.map((cell) => {
              const dateSessions = sessionsByDate[cell.dateStr] || [];
              const isSelected = selectedDateStr === cell.dateStr;
              const isToday = cell.dateStr === todayISO;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`group relative min-h-[92px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20"
                      : cell.isCurrentMonth
                      ? "border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/10"
                      : "border-gray-50 bg-gray-50/30 text-gray-300 opacity-50"
                  }`}
                >
                  {/* Top Bar: Date Number & Add Button */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? "h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs"
                          : isSelected
                          ? "text-indigo-900 font-extrabold"
                          : cell.isCurrentMonth
                          ? "text-gray-700"
                          : "text-gray-300"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onScheduleForDate(cell.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:bg-indigo-100 text-indigo-600"
                      title="Schedule Class on this date"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Session Pills Inside Date Cell */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dateSessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAttendance(s);
                        }}
                        className={`px-1.5 py-1 rounded-lg text-[10px] font-medium border flex items-center justify-between gap-1 transition-all ${
                          s.isAttendanceMarked
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-2xs"
                            : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 shadow-2xs"
                        }`}
                        title={`${s.subject} (${s.startTime})`}
                      >
                        <span className="truncate font-bold">{s.subject}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 border-0 font-semibold ${
                            s.isAttendanceMarked ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
                          }`}
                        >
                          {s.isAttendanceMarked ? "Saved" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail Drawer (1 col) */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Selected Date</span>
                <h4 className="text-sm font-bold text-gray-900 mt-0.5">{selectedDateStr}</h4>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={() => onScheduleForDate(selectedDateStr)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Class
              </Button>
            </div>

            {selectedDateSessions.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-gray-700">No classes scheduled</p>
                <p className="text-[11px] text-gray-400">Click &quot;Add Class&quot; above to schedule a class session.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-2.5 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">{s.subject}</h5>
                        <p className="text-[11px] font-medium text-indigo-600 mt-0.5">{s.batchName}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          s.isAttendanceMarked
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                            : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                        }
                      >
                        {s.isAttendanceMarked ? "Saved" : "Pending"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{s.startTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{s.roomNo}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Users className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate font-semibold text-gray-800">{s.roster.length} Enrolled Students</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-indigo-100/60">
                      <Button
                        size="sm"
                        variant={s.isAttendanceMarked ? "outline" : "default"}
                        className="text-xs h-7 px-2.5"
                        onClick={() => onMarkAttendance(s)}
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        {s.isAttendanceMarked ? "Roster" : "Mark Attendance"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        title="Edit Schedule"
                        onClick={() => onEditSchedule(s)}
                      >
                        <Pencil className="h-3 w-3 text-indigo-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                        title="Delete Schedule"
                        onClick={() => onDeleteSchedule(s.id, s.subject, s.batchName)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [selectedDay, setSelectedDay] = useState("All");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ClassSession | null>(null);

  useEffect(() => {
    if (searchParams.get("openSchedule") === "true") {
      setScheduleDialogOpen(true);
    }
  }, [searchParams]);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["franchise-class-sessions", selectedDay],
    queryFn: () => fetchFranchiseClassSessions(selectedDay),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["franchise-class-sessions"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFranchiseClassSession(id),
    onSuccess: () => {
      toast.success("Class Schedule deleted successfully!");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete schedule"),
  });

  const markedCount = useMemo(() => sessions.filter((s) => s.isAttendanceMarked).length, [sessions]);
  const pendingCount = useMemo(() => sessions.filter((s) => !s.isAttendanceMarked).length, [sessions]);

  const columns: DataTableColumn<ClassSession>[] = useMemo(
    () => [
      {
        key: "time",
        header: "Date & Time",
        render: (row) => (
          <div className="text-xs">
            <div className="font-semibold text-foreground">{row.date} ({row.dayOfWeek})</div>
            <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" /> {row.startTime}
            </div>
          </div>
        ),
      },
      {
        key: "instructor",
        header: "Instructor & Room",
        render: (row) => (
          <div className="text-xs">
            <div className="font-medium">{row.instructorName}</div>
            <div className="text-muted-foreground">{row.roomNo}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge
            variant="outline"
            className={
              row.isAttendanceMarked
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }
          >
            {row.isAttendanceMarked ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pending
              </span>
            )}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant={row.isAttendanceMarked ? "outline" : "default"}
              onClick={() => {
                setActiveSession(row);
                setAttendanceDialogOpen(true);
              }}
            >
              <UserCheck className="mr-1.5 h-3.5 w-3.5" />
              {row.isAttendanceMarked ? "Edit Roster" : "Mark Attendance"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              title="Edit Schedule"
              onClick={() => {
                setEditingSession(row);
                setScheduleDialogOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5 text-indigo-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              title="Delete Schedule"
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${row.subject}" (${row.batchName})?`)) {
                  deleteMutation.mutate(row.id);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation],
  );

  return (
    <TablePageShell
      title="Class Schedule & Attendance Calendar"
      description="Manage class timetables, view monthly calendar grids, and mark 1-tap student attendance rosters."
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-2xs">
            <Button
              size="sm"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              onClick={() => setViewMode("calendar")}
              className="h-8 px-3 text-xs rounded-lg font-semibold flex items-center gap-1.5"
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar View
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className="h-8 px-3 text-xs rounded-lg font-semibold flex items-center gap-1.5"
            >
              <List className="h-3.5 w-3.5" /> List View
            </Button>
          </div>
          <Button
            onClick={() => {
              setEditingSession(null);
              setScheduleDialogOpen(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Schedule Class
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="rounded-2xl border-gray-100 shadow-xs">
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 text-indigo-600" /> Total Classes Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1 pb-4">
            <div className="text-2xl font-extrabold text-gray-900">{sessions.length}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-emerald-100 bg-emerald-50/20 shadow-xs">
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-emerald-800 flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Attendance Saved
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1 pb-4">
            <div className="text-2xl font-extrabold text-emerald-600">{markedCount}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-100 bg-amber-50/20 shadow-xs">
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-amber-800 flex items-center gap-1.5 font-semibold">
              <Clock className="h-4 w-4 text-amber-600" /> Pending Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1 pb-4">
            <div className="text-2xl font-extrabold text-amber-600">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : viewMode === "calendar" ? (
        <FranchiseCalendarView
          sessions={sessions}
          onMarkAttendance={(s) => {
            setActiveSession(s);
            setAttendanceDialogOpen(true);
          }}
          onEditSchedule={(s) => {
            setEditingSession(s);
            setScheduleDialogOpen(true);
          }}
          onDeleteSchedule={(id, subject, batch) => {
            if (confirm(`Are you sure you want to delete "${subject}" (${batch})?`)) {
              deleteMutation.mutate(id);
            }
          }}
          onScheduleForDate={() => {
            setEditingSession(null);
            setScheduleDialogOpen(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1 overflow-x-auto pb-3 border-b">
            {DAYS.map((day) => (
              <Button
                key={day}
                size="sm"
                variant={selectedDay === day ? "default" : "ghost"}
                onClick={() => setSelectedDay(day)}
                className="rounded-full px-4 text-xs font-medium"
              >
                {day}
              </Button>
            ))}
          </div>

          <DataTable
            data={sessions}
            loading={isLoading}
            columns={columns}
            getRowId={(row) => String(row.id)}
            renderMainCell={(row) => (
              <TableMainCell title={row.subject} subtitle={`${row.batchName} • ${row.roster.length} enrolled`} />
            )}
            emptyMessage="No classes scheduled for this filter."
          />
        </div>
      )}

      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSaved={invalidate}
        initialSession={editingSession}
      />

      <AttendanceRosterDialog
        session={activeSession}
        open={attendanceDialogOpen}
        onOpenChange={setAttendanceDialogOpen}
        onSaved={invalidate}
      />
    </TablePageShell>
  );
}

export default function FranchiseAttendancePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AttendanceContent />
    </Suspense>
  );
}
