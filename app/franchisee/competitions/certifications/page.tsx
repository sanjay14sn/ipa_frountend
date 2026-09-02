"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, PlusCircle, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { extractErrorMessage } from "@/lib/error-utils";
import { PageSkeleton } from "@/components/shared";
import {
  listFranchiseeCertificateRequests,
  submitCertificateRequest,
  downloadCertificate,
  type CertificateRequest,
  type CertificateRequestStatus,
} from "@/services/certificate-request.service";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  icon: React.ReactNode;
}

function getStatusConfig(status: CertificateRequestStatus): StatusConfig {
  switch (status) {
    case "APPROVED":
      return { label: "Approved", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> };
    case "REJECTED":
      return { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> };
    default:
      return { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" /> };
  }
}

// ─── Request Dialog ─────────────────────────────────────────────────────────

interface CompetitionOption {
  id: number;
  title: string;
}

interface StudentOption {
  id: number;
  name: string;
  rollNo: string;
  competitionId: number;
  completedLevelName: string;
}

function RequestCertificateDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [competitionId, setCompetitionId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");

  // Fetch opted-in competitions
  const { data: competitionsData } = useQuery({
    queryKey: ["franchisee-competitions-all"],
    queryFn: async () => {
      const res = await api.get("/competitions/franchise?page=1&limit=100");
      const payload = res.data?.data ?? res.data?.result ?? res.data;
      return (payload?.items ?? []) as CompetitionOption[];
    },
    enabled: open,
  });

  const competitions = (competitionsData ?? []).filter((c: any) => c.isApprovedByFranchise);

  // Fetch paid registrations for selected competition
  const { data: registrationsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["franchise-comp-students-cert", competitionId],
    queryFn: async () => {
      const res = await api.get(`/competitions/franchise/${competitionId}/students`);
      const data = res.data?.result || res.data?.data || res.data;
      const regs = data?.result ?? data ?? [];
      return (regs as any[])
        .filter((r: any) => r.paymentStatus === "COMPLETED" && !r.hasCertificateRequest)
        .map((r: any) => ({
          id: r.student?.id ?? r.studentId,
          name: r.student?.name ?? `Student #${r.studentId}`,
          rollNo: r.student?.rollNo ?? "—",
          competitionId: Number(competitionId),
          completedLevelName: r.completedLevel?.name ?? "—",
        })) as StudentOption[];
    },
    enabled: open && !!competitionId,
  });

  const students = registrationsData ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      submitCertificateRequest(Number(studentId), Number(competitionId)),
    onSuccess: () => {
      toast.success("Certificate request submitted successfully!");
      setOpen(false);
      setCompetitionId("");
      setStudentId("");
      onSuccess();
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, "Failed to submit request."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;
    if (!competitionId || !studentId) {
      toast.error("Please select both a competition and a student.");
      return;
    }
    mutation.mutate();
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setCompetitionId("");
      setStudentId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Request Certificate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request a Competition Certificate</DialogTitle>
            <DialogDescription>
              Select a competition and one of your paid, registered students. The
              super admin will review and approve the request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="competition-select">Competition</Label>
              <Select
                value={competitionId}
                onValueChange={(v) => {
                  setCompetitionId(v);
                  setStudentId("");
                }}
              >
                <SelectTrigger id="competition-select">
                  <SelectValue placeholder="Select a competition…" />
                </SelectTrigger>
                <SelectContent>
                  {competitions.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No opted-in competitions found.
                    </div>
                  ) : (
                    competitions.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="student-select">Student</Label>
              <Select
                value={studentId}
                onValueChange={setStudentId}
                disabled={!competitionId || loadingStudents}
              >
                <SelectTrigger id="student-select">
                  <SelectValue
                    placeholder={
                      !competitionId
                        ? "Select a competition first"
                        : loadingStudents
                        ? "Loading students…"
                        : students.length === 0
                        ? "No paid registrations found"
                        : "Select a student…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                      {s.rollNo !== "—" ? ` (${s.rollNo})` : ""}
                      {s.completedLevelName !== "—"
                        ? ` — Level: ${s.completedLevelName}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {studentId && students.length > 0 && (() => {
              const s = students.find((x) => String(x.id) === studentId);
              if (!s) return null;
              return (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student</span>
                    <span className="font-medium">{s.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Roll No</span>
                    <span className="font-medium">{s.rollNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed Level</span>
                    <span className="font-medium">{s.completedLevelName}</span>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !competitionId || !studentId}
            >
              {mutation.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Section ────────────────────────────────────────────────────────────

function CertificationsSection() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["franchisee-cert-requests", page],
    queryFn: () => listFranchiseeCertificateRequests(page, limit),
  });

  const requests: CertificateRequest[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["franchisee-cert-requests"] });
    queryClient.invalidateQueries({ queryKey: ["franchise-comp-students-cert"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Certifications
          </CardTitle>
          <CardDescription className="mt-1">
            Request competition certificates for your registered students. The
            super admin will review and approve each request.
          </CardDescription>
        </div>
        <RequestCertificateDialog onSuccess={handleSuccess} />
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading certificate requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Award className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-muted-foreground">No certificate requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Request Certificate" to get started.
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Student</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Roll No</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Competition</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Completed Level</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Requested On</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Status</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Admin Note</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const { label, variant, icon } = getStatusConfig(req.status);
                const completedLevel =
                  req.registration?.completedLevel?.name ?? "—";
                return (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.student?.name ?? `Student #${req.studentId}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {req.student?.rollNo ?? "—"}
                    </TableCell>
                    <TableCell>{req.competition?.title ?? "—"}</TableCell>
                    <TableCell>{completedLevel}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(req.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={variant}
                        className="gap-1 text-[11px] px-2 py-0.5"
                      >
                        {icon}
                        {label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {req.adminNote ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          onClick={() => {
                            toast.promise(downloadCertificate(req.id), {
                              loading: "Generating certificate...",
                              success: "Certificate downloaded successfully",
                              error: "Failed to download certificate",
                            });
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-4">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FranchiseeCompetitionCertificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="p-6">
        <CertificationsSection />
      </div>
    </Suspense>
  );
}
