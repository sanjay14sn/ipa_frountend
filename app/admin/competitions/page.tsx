"use client";

import { useMemo, useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Eye, Edit, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { getStreamsByProgram, type Stream } from "@/services/stream.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Checkbox } from "@/components/ui/checkbox";


import { formatDate } from "@/lib/date-utils";
import { formatRupees } from "@/lib/currency-utils";
import {
  DataTable,
  PageSkeleton,
  RowActionButton,
  StatusBadge,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CompetitionForm({ 
  streams, 
  initialData,
  onSubmit, 
  onCancel,
  isPending
}: { 
  streams: Stream[] | undefined; 
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [selectedStreams, setSelectedStreams] = useState<number[]>(initialData?.eligibility || []);
  const [competitionType, setCompetitionType] = useState<string>(initialData?.type || "BOTH");
  const [competitionStatus, setCompetitionStatus] = useState<string>(
    initialData?.status || "ACTIVE",
  );
  const [closingDate, setClosingDate] = useState(() => toDateInputValue(initialData?.closingDate));
  const [competitionDate, setCompetitionDate] = useState(() => toDateInputValue(initialData?.competitionDate));

  const today = todayDateInputValue();
  const maxClosingDate = competitionDate ? addDays(competitionDate, -1) : undefined;
  const closingDateUnavailable = Boolean(
    competitionDate && maxClosingDate && maxClosingDate < today,
  );
  const datesInvalid = Boolean(competitionDate && closingDate && closingDate >= competitionDate);
  const pastDateSelected = Boolean(
    (competitionDate && competitionDate < today) ||
    (closingDate && closingDate < today),
  );

  const handleCompetitionDateChange = (value: string) => {
    setCompetitionDate(value);
    const nextMaxClosing = value ? addDays(value, -1) : undefined;
    if (
      closingDate &&
      value &&
      (closingDate >= value || (nextMaxClosing && nextMaxClosing < today))
    ) {
      setClosingDate("");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!competitionDate) {
      toast.error("Please select the competition date first.");
      return;
    }

    if (!closingDate) {
      toast.error("Please select the closing date.");
      return;
    }

    if (closingDate >= competitionDate) {
      toast.error("Closing date must be before the competition date.");
      return;
    }

    if (competitionDate < today || closingDate < today) {
      toast.error("Past dates are not allowed.");
      return;
    }

    const data = {
      title: formData.get("title"),
      description: formData.get("description"),
      baseFee: Number(formData.get("baseFee")),
      closingDate,
      competitionDate: competitionDate || null,
      type: competitionType,
      bothDiscountAmount:
        competitionType === "BOTH"
          ? Number(formData.get("bothDiscountAmount") || 0)
          : 0,
      practicePaperCost: Number(formData.get("practicePaperCost") || 0),
      practicePaperCount: Number(formData.get("practicePaperCount") || 0),
      venue: formData.get("venue") || "",
      status: competitionStatus,
      eligibility: selectedStreams,
      franchiseBenefit: (() => {
        const raw = formData.get("franchiseBenefit");
        if (raw == null || raw === "") return null;
        return Number(raw);
      })(),
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{initialData ? "Edit Competition" : "Create Competition"}</DialogTitle>
        <DialogDescription>
          {initialData ? "Update the details for this competition." : "Add a new competition for franchisees to opt into."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={initialData?.title} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={initialData?.description} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={competitionType}
              onValueChange={setCompetitionType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONLINE">Online Only</SelectItem>
                <SelectItem value="OFFLINE">Offline Only</SelectItem>
                <SelectItem value="BOTH">Both (Online & Offline)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="competitionDate">Competition Date</Label>
            <Input
              id="competitionDate"
              name="competitionDate"
              type="date"
              value={competitionDate}
              min={today}
              onChange={(event) => handleCompetitionDateChange(event.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="closingDate">Head Office Closing Date</Label>
            <Input
              id="closingDate"
              name="closingDate"
              type="date"
              value={closingDate}
              min={today}
              max={maxClosingDate}
              disabled={!competitionDate || closingDateUnavailable}
              onChange={(event) => setClosingDate(event.target.value)}
              required
            />
            {!competitionDate ? (
              <p className="text-sm text-muted-foreground">
                Select the competition date first.
              </p>
            ) : closingDateUnavailable ? (
              <p className="text-sm text-muted-foreground">
                Competition date must be after today to set a closing date.
              </p>
            ) : datesInvalid ? (
              <p className="text-sm text-destructive">
                Closing date must be before the competition date.
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" name="venue" defaultValue={initialData?.venue} placeholder="E.g., Virtual or City Hall" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={competitionStatus} onValueChange={setCompetitionStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="baseFee">Base Fee (₹)</Label>
            <Input id="baseFee" name="baseFee" type="number" min="0" defaultValue={initialData?.baseFee} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="practicePaperCost">Practice Paper Cost (₹)</Label>
            <Input id="practicePaperCost" name="practicePaperCost" type="number" min="0" defaultValue={initialData?.practicePaperCost || "0"} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="practicePaperCount">Practice Paper Count</Label>
            <Input
              id="practicePaperCount"
              name="practicePaperCount"
              type="number"
              min="0"
              step="1"
              defaultValue={initialData?.practicePaperCount ?? "0"}
              placeholder="Number of practice papers included"
            />
          </div>
          {competitionType === "BOTH" ? (
            <div className="grid gap-2">
              <Label htmlFor="bothDiscountAmount">
                Discount if Online & Offline Selected (₹)
              </Label>
              <Input
                id="bothDiscountAmount"
                name="bothDiscountAmount"
                type="number"
                min="0"
                defaultValue={initialData?.bothDiscountAmount || "0"}
              />
              <p className="text-sm text-muted-foreground">
                Applied when a student registers for both online and offline.
              </p>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="franchiseBenefit">Franchise Benefit (₹)</Label>
            <Input
              id="franchiseBenefit"
              name="franchiseBenefit"
              type="number"
              min="0"
              step="1"
              defaultValue={initialData?.franchiseBenefit ?? ""}
              placeholder="E.g. 500"
            />
          </div>
        </div>
        
        <div className="grid gap-2">
          <Label>Eligibility (Target Streams)</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
            {streams?.map((stream) => (
              <Label 
                key={stream.id} 
                className={`flex items-start space-x-3 border rounded-lg p-3 transition-colors cursor-pointer select-none ${selectedStreams.includes(stream.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
              >
                <Checkbox 
                  checked={selectedStreams.includes(stream.id)} 
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedStreams(prev => [...prev, stream.id]);
                    } else {
                      setSelectedStreams(prev => prev.filter(id => id !== stream.id));
                    }
                  }}
                />
                <div className="flex flex-col gap-1 -mt-0.5">
                  <span className="font-medium text-sm leading-none">{stream.name}</span>
                  <span className="text-xs text-muted-foreground">{stream.levelCount || 0} levels · {stream.minAge || stream.maxAge ? `Ages ${stream.minAge || "—"}–${stream.maxAge || "—"}` : "Any age"}</span>
                </div>
              </Label>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || datesInvalid || pastDateSelected || !competitionDate || closingDateUnavailable}>
          {isPending ? "Saving..." : initialData ? "Update Competition" : "Save Competition"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type CompetitionRow = {
  id: number;
  title: string;
  type: string;
  baseFee: number;
  closingDate: string;
  competitionDate: string | null;
  status: string;
};

function CompetitionsSection() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<any>(null);
  const [viewingCompetition, setViewingCompetition] = useState<any>(null);
  const [deletingCompetition, setDeletingCompetition] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("closingDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: competitions, isLoading } = useQuery({
    queryKey: ["admin-competitions"],
    queryFn: async () => {
      const res = await api.get("/competitions/admin");
      const payload = res.data?.data ?? res.data?.result ?? res.data;
      return (Array.isArray(payload) ? payload : []) as CompetitionRow[];
    },
  });

  const { data: streams } = useQuery({
    queryKey: ["streams-by-program", 1],
    queryFn: () => getStreamsByProgram(1),
  });

  const createMutation = useMutation({
    mutationFn: async (newComp: any) => {
      return api.post("/competitions/admin", newComp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-competitions"] });
      setIsCreateDialogOpen(false);
      toast.success("Competition created successfully");
    },
    onError: (err: any) => {
      const details = err.response?.data?.details?.fields;
      const fieldMessage =
        details &&
        Object.entries(details as Record<string, string>)
          .map(([field, message]) => `${field}: ${message}`)
          .join("; ");
      toast.error(
        fieldMessage ||
          err.response?.data?.message ||
          "Failed to create competition",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return api.put(`/competitions/admin/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-competitions"] });
      setEditingCompetition(null);
      toast.success("Competition updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update competition");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/competitions/admin/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-competitions"] });
      setDeletingCompetition(null);
      toast.success("Competition deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete competition");
    },
  });

  const competitionRows = useMemo(() => competitions ?? [], [competitions]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = competitionRows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.title.toLowerCase().includes(normalizedSearch) ||
        row.type.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" || row.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "baseFee":
          comparison = a.baseFee - b.baseFee;
          break;
        case "competitionDate":
          comparison =
            new Date(a.competitionDate ?? 0).getTime() -
            new Date(b.competitionDate ?? 0).getTime();
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "closingDate":
        default:
          comparison =
            new Date(a.closingDate).getTime() - new Date(b.closingDate).getTime();
          break;
      }
      return sortOrder === "ASC" ? comparison : -comparison;
    });
  }, [competitionRows, searchTerm, sortBy, sortOrder, statusFilter]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [currentPage, filteredRows, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));

  const columns: DataTableColumn<CompetitionRow>[] = useMemo(
    () => [
      {
        key: "type",
        header: "Type",
        className: "w-[120px]",
        render: (row) => <span className="text-sm capitalize">{row.type.toLowerCase()}</span>,
      },
      {
        key: "baseFee",
        header: "Base fee",
        className: "w-[120px]",
        render: (row) => (
          <span className="font-mono text-sm tabular-nums">{formatRupees(row.baseFee)}</span>
        ),
      },
      {
        key: "closingDate",
        header: "Closing date",
        className: "w-[130px]",
        render: (row) => formatDate(row.closingDate),
      },
      {
        key: "competitionDate",
        header: "Competition date",
        className: "w-[150px]",
        render: (row) => (row.competitionDate ? formatDate(row.competitionDate) : "—"),
      },
      {
        key: "status",
        header: "Status",
        className: "w-[120px] text-center",
        render: (row) => <StatusBadge label={row.status} />,
      },
      {
        key: "actions",
        header: "",
        className: "w-[168px]",
        render: (row) => (
          <div className="flex items-center justify-end gap-0.5">
            <RowActionButton
              icon={Users}
              label="View registrations"
              onClick={() => router.push(`/admin/competitions/${row.id}/registrations`)}
            />
            <RowActionButton
              icon={Eye}
              label="View competition"
              onClick={() => setViewingCompetition(row)}
            />
            <RowActionButton
              icon={Edit}
              label="Edit competition"
              onClick={() => setEditingCompetition(row)}
            />
            <RowActionButton
              icon={Trash2}
              label="Delete competition"
              tone="destructive"
              onClick={() => setDeletingCompetition(row)}
            />
          </div>
        ),
      },
    ],
    [router],
  );

  const statusFilters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "ACTIVE", label: "Active" },
        { value: "DRAFT", label: "Draft" },
        { value: "CLOSED", label: "Closed" },
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "title", label: "Title" },
    { value: "closingDate", label: "Closing date" },
    { value: "competitionDate", label: "Competition date" },
    { value: "baseFee", label: "Base fee" },
    { value: "status", label: "Status" },
  ];

  const createDialog = (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Competition
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {isCreateDialogOpen && (
          <CompetitionForm
            streams={streams}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreateDialogOpen(false)}
            isPending={createMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <TablePageShell
      embed
      title="Active Competitions"
      description="A list of all competitions currently running."
      actions={createDialog}
    >
      <DataTable
        data={paginatedRows}
        loading={isLoading}
        columns={columns}
        getRowId={(row) => String(row.id)}
        renderMainCell={(row) => <TableMainCell title={row.title} />}
        searchPlaceholder="Search competitions by title or type..."
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        filters={statusFilters}
        onFilterChange={(key, value) => {
          if (key === "status") {
            setStatusFilter(String(value));
            setCurrentPage(1);
          }
        }}
        sortOptions={sortOptions}
        defaultSortBy="closingDate"
        defaultSortOrder="DESC"
        onSortChange={(nextSortBy, nextSortOrder) => {
          setSortBy(nextSortBy);
          setSortOrder(nextSortOrder);
        }}
        pagination={{ total: filteredRows.length, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        emptyState={{
          title: "No competitions found",
          hint: searchTerm || statusFilter !== "all"
            ? "Try adjusting your search or filters."
            : "Create a competition to get started.",
          action:
            !searchTerm && statusFilter === "all" ? (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Competition
              </Button>
            ) : undefined,
        }}
        resultsText={(count, total) => `Showing ${count} of ${total} competitions`}
        tableClassName="table-fixed"
        columnGroupWidths={["120px", "120px", "130px", "150px", "120px", "168px"]}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingCompetition} onOpenChange={(open) => !open && setEditingCompetition(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {editingCompetition && (
            <CompetitionForm 
              streams={streams} 
              initialData={editingCompetition}
              onSubmit={(data) => updateMutation.mutate({ id: editingCompetition.id, data })}
              onCancel={() => setEditingCompetition(null)} 
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingCompetition} onOpenChange={(open) => !open && setViewingCompetition(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewingCompetition && (
            <>
              <DialogHeader>
                <DialogTitle>Competition Details</DialogTitle>
                <DialogDescription>Viewing details for {viewingCompetition.title}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Title</span>
                    <p className="font-medium">{viewingCompetition.title}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="font-medium">{viewingCompetition.description || "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Type</span>
                    <p className="font-medium">{viewingCompetition.type}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Competition Date</span>
                    <p className="font-medium">
                      {viewingCompetition.competitionDate
                        ? new Date(viewingCompetition.competitionDate).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Head Office Closing Date</span>
                    <p className="font-medium">{new Date(viewingCompetition.closingDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <p className="font-medium">
                      <Badge variant={viewingCompetition.status === "ACTIVE" ? "default" : "secondary"}>
                        {viewingCompetition.status}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Base Fee</span>
                    <p className="font-medium">₹{viewingCompetition.baseFee}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Practice Paper Cost</span>
                    <p className="font-medium">₹{viewingCompetition.practicePaperCost}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Practice Paper Count</span>
                    <p className="font-medium">{viewingCompetition.practicePaperCount ?? 0}</p>
                  </div>
                  {viewingCompetition.type === "BOTH" ? (
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Discount if Online & Offline Selected
                      </span>
                      <p className="font-medium">₹{viewingCompetition.bothDiscountAmount}</p>
                    </div>
                  ) : null}
                  <div>
                    <span className="text-sm text-muted-foreground">Venue</span>
                    <p className="font-medium">{viewingCompetition.venue || "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Franchise Benefit</span>
                    <p className="font-medium">
                      {viewingCompetition.franchiseBenefit != null &&
                      viewingCompetition.franchiseBenefit !== ""
                        ? `₹${viewingCompetition.franchiseBenefit}`
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground mb-2 block">Eligible Streams</span>
                  <div className="flex flex-wrap gap-2">
                    {streams?.filter(s => viewingCompetition.eligibility?.includes(s.id)).map(stream => (
                      <Badge key={stream.id} variant="outline">{stream.name}</Badge>
                    ))}
                    {!viewingCompetition.eligibility?.length && <p className="text-sm">No specific streams selected.</p>}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setViewingCompetition(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deletingCompetition} onOpenChange={(open) => !open && setDeletingCompetition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Competition</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingCompetition?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCompetition(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deletingCompetition.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TablePageShell>
  );
}

export default function AdminCompetitionsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="p-6">
        <CompetitionsSection />
      </div>
    </Suspense>
  );
}
