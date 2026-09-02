"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/date-utils";
// eslint-disable-next-line no-restricted-imports -- sanctioned raw usage for custom modal layout
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  listAdminCertificateRequests,
  approveCertificateRequest,
  bulkApproveCertificateRequests,
  rejectCertificateRequest,
  downloadAdminCertificate,
  getAdminCertificatePreviewUrl,
  type CertificateRequest,
  type CertificateRequestStatus,
} from "@/services/certificate-request.service";

interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  icon: React.ReactNode;
  className?: string;
}

function getStatusConfig(status: CertificateRequestStatus): StatusConfig {
  switch (status) {
    case "APPROVED":
      return {
        label: "Approved",
        variant: "default",
        icon: <CheckCircle2 className="h-3 w-3" />,
        className: "bg-emerald-600 text-white hover:bg-emerald-700",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        variant: "destructive",
        icon: <XCircle className="h-3 w-3" />,
      };
    default:
      return {
        label: "Pending",
        variant: "secondary",
        icon: <Clock className="h-3 w-3" />,
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      };
  }
}

// ─── Approve Dialog ──────────────────────────────────────────────────────────

function ApproveDialog({
  request,
  open,
  onOpenChange,
  onDone,
}: {
  request: CertificateRequest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => approveCertificateRequest(request!.id, note.trim() || undefined),
    onSuccess: () => {
      toast.success("Certificate request approved.");
      onDone();
      onOpenChange(false);
      setNote("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to approve request.");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setNote("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            Approve Certificate Request
          </DialogTitle>
          <DialogDescription>
            You are approving the certificate request for{" "}
            <strong>{request?.student?.name ?? `Student #${request?.studentId}`}</strong>{" "}
            in <strong>{request?.competition?.title ?? "this competition"}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Label htmlFor="approve-note">Note (optional)</Label>
          <Textarea
            id="approve-note"
            placeholder="Add a note for the franchisee…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Approving…" : "Confirm Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject Dialog ───────────────────────────────────────────────────────────

function RejectDialog({
  request,
  open,
  onOpenChange,
  onDone,
}: {
  request: CertificateRequest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => rejectCertificateRequest(request!.id, reason),
    onSuccess: () => {
      toast.success("Certificate request rejected.");
      onDone();
      onOpenChange(false);
      setReason("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to reject request.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setReason("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Reject Certificate Request
            </DialogTitle>
            <DialogDescription>
              You are rejecting the certificate request for{" "}
              <strong>{request?.student?.name ?? `Student #${request?.studentId}`}</strong>{" "}
              in <strong>{request?.competition?.title ?? "this competition"}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <Label htmlFor="reject-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain why the request is being rejected…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={mutation.isPending || !reason.trim()}
            >
              {mutation.isPending ? "Rejecting…" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Approve Dialog ─────────────────────────────────────────────────────

function BulkApproveDialog({
  selectedIds,
  open,
  onOpenChange,
  onDone,
}: {
  selectedIds: number[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => bulkApproveCertificateRequests(selectedIds, note.trim() || undefined),
    onSuccess: () => {
      toast.success(`Successfully approved ${selectedIds.length} requests.`);
      onDone();
      onOpenChange(false);
      setNote("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to bulk approve requests.");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setNote("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            Bulk Approve Requests
          </DialogTitle>
          <DialogDescription>
            You are about to approve <strong>{selectedIds.length}</strong> certificate request(s).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Label htmlFor="bulk-approve-note">Note (optional)</Label>
          <Textarea
            id="bulk-approve-note"
            placeholder="Add an optional note to all approved requests…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Approving…" : "Confirm Bulk Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preview Dialog ────────────────────────────────────────────────────────────

function PreviewDialog({
  request,
  open,
  onOpenChange,
}: {
  request: CertificateRequest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && request) {
      let active = true;
      setLoading(true);
      getAdminCertificatePreviewUrl(request.id)
        .then((url) => {
          if (active) {
            setPreviewUrl(url);
            setLoading(false);
          } else {
            URL.revokeObjectURL(url);
          }
        })
        .catch((err) => {
          if (active) {
            toast.error("Failed to load preview.");
            setLoading(false);
            onOpenChange(false);
          }
        });
      return () => {
        active = false;
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    } else {
      setPreviewUrl(null);
    }
  }, [open, request]); // intentionally exclude previewUrl

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Eye className="h-5 w-5" />
            Certificate Preview - {request?.student?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full bg-muted/30 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Generating preview...
            </div>
          ) : previewUrl ? (
            <iframe
              src={`${previewUrl}#toolbar=0`}
              className="w-full h-full border-0"
              title="Certificate Preview"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Section ────────────────────────────────────────────────────────────

export function CertificationsSection() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const limit = 15;

  const [approvingReq, setApprovingReq] = useState<CertificateRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<CertificateRequest | null>(null);
  const [previewingReq, setPreviewingReq] = useState<CertificateRequest | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== debouncedSearch) {
        setDebouncedSearch(search);
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setSelectedIds([]); // Clear selection when searching
  };

  const handleStatusFilterChange = (v: string) => {
    setStatusFilter(v);
    setPage(1);
    setSelectedIds([]); // Clear selection when filtering
  };

  const toggleSelectionAll = () => {
    if (selectedIds.length === requests.length && requests.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.filter(r => r.status === "PENDING").map(r => r.id));
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-cert-requests", page, statusFilter, debouncedSearch],
    queryFn: () =>
      listAdminCertificateRequests({
        page,
        limit,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const requests: CertificateRequest[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-cert-requests"] });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Certificate Requests
              </CardTitle>
              <CardDescription className="mt-1">
                Review and approve or reject competition certificate requests from
                franchisees.
              </CardDescription>
            </div>

            {/* Summary chips */}
            <div className="flex gap-2 flex-wrap">
              {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => {
                const cfg = getStatusConfig(s);
                const count = (data?.items ?? []).filter((r) => r.status === s).length;
                return (
                  <Badge
                    key={s}
                    variant={cfg.variant}
                    className={`gap-1 cursor-pointer select-none text-xs px-3 py-1 ${cfg.className ?? ""}`}
                    onClick={() => {
                      setStatusFilter(statusFilter === s ? "all" : s);
                      setPage(1);
                    }}
                  >
                    {cfg.icon} {cfg.label}
                    {statusFilter !== "all" && statusFilter === s ? null : (
                      <span className="ml-1 opacity-70">({count})</span>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student or franchise name…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {selectedIds.length > 0 && (
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 w-full sm:w-auto"
                onClick={() => setBulkApproving(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve Selected ({selectedIds.length})
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading certificate requests…
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Award className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No certificate requests found</p>
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Franchisees haven't submitted any requests yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={requests.length > 0 && selectedIds.length === requests.filter(r => r.status === "PENDING").length && requests.filter(r => r.status === "PENDING").length > 0}
                      onCheckedChange={toggleSelectionAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Student</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Roll No</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Franchise</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Competition</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Completed Level</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Requested On</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Note / Reason</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const { label, variant, icon, className: badgeClass } = getStatusConfig(req.status);
                  const completedLevel = req.registration?.completedLevel?.name ?? "—";
                  const isPending = req.status === "PENDING";

                  return (
                    <TableRow key={req.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(req.id)}
                          onCheckedChange={() => toggleSelection(req.id)}
                          disabled={!isPending}
                          aria-label={`Select request ${req.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {req.student?.name ?? `Student #${req.studentId}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {req.student?.rollNo ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {req.franchise?.name ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {req.competition?.title ?? "—"}
                      </TableCell>
                      <TableCell>{completedLevel}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(req.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={variant}
                          className={`gap-1 text-[11px] px-2 py-0.5 ${badgeClass ?? ""}`}
                        >
                          {icon}
                          {label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                        {req.adminNote ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              onClick={() => setApprovingReq(req)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => setRejectingReq(req)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        ) : req.status === "APPROVED" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 px-2"
                              onClick={() => setPreviewingReq(req)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="sr-only sm:not-sr-only sm:ml-1 text-xs">Preview</span>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 gap-1 px-2"
                              onClick={() => downloadAdminCertificate(req.id)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span className="sr-only sm:not-sr-only sm:ml-1 text-xs">Download</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(req.actionedAt)}
                          </span>
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

      {/* Approve Dialog */}
      <ApproveDialog
        request={approvingReq}
        open={!!approvingReq}
        onOpenChange={(v) => !v && setApprovingReq(null)}
        onDone={invalidate}
      />

      {/* Reject Dialog */}
      <RejectDialog
        request={rejectingReq}
        open={!!rejectingReq}
        onOpenChange={(v) => !v && setRejectingReq(null)}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-cert-requests"] });
          setSelectedIds([]);
        }}
      />

      <BulkApproveDialog
        selectedIds={selectedIds}
        open={bulkApproving}
        onOpenChange={setBulkApproving}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-cert-requests"] });
          setSelectedIds([]);
        }}
      />
      
      <PreviewDialog
        request={previewingReq}
        open={!!previewingReq}
        onOpenChange={(v) => !v && setPreviewingReq(null)}
      />
    </>
  );
}
