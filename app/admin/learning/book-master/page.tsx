"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, PlusCircle, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  PageSkeleton,
  RowActionButton,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
} from "@/components/shared";
import { getLevelsByProgram } from "@/services/level.service";
import { getAllStreams, getLevelsByStream } from "@/services/stream.service";
import {
  activateAdminBook,
  createAdminBook,
  deactivateAdminBook,
  deleteAdminBook,
  fetchAdminBooks,
  updateAdminBook,
  type LearningBook,
  type LearningBookChapter,
} from "@/services/learning.service";

const EMPTY_CHAPTER = (): LearningBookChapter => ({
  title: "",
  pageFrom: 1,
  pageTo: 1,
  sortOrder: 0,
});

function BookFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: LearningBook | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [streamId, setStreamId] = useState(0);
  const [levelId, setLevelId] = useState(0);
  const [subject, setSubject] = useState("");
  const [totalPages, setTotalPages] = useState("120");
  const [description, setDescription] = useState("");
  const [chapters, setChapters] = useState<LearningBookChapter[]>([EMPTY_CHAPTER()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: streams = [], isLoading: loadingStreams } = useQuery({
    queryKey: ["catalog-streams-all"],
    queryFn: getAllStreams,
    enabled: open,
  });

  const { data: levels = [], isLoading: loadingLevels } = useQuery({
    queryKey: ["catalog-levels-by-stream", streamId],
    queryFn: () => getLevelsByStream(streamId),
    enabled: open && streamId > 0,
  });

  const selectedStream = useMemo(
    () => streams.find((stream) => stream.id === streamId),
    [streams, streamId],
  );

  useEffect(() => {
    if (!open) return;

    const resetForm = () => {
      setTitle(initial?.title ?? "");
      setStreamId(0);
      setLevelId(initial?.levelId ?? 0);
      setSubject(initial?.subject ?? "");
      setTotalPages(String(initial?.totalPages ?? "120"));
      setDescription(initial?.description ?? "");
      setChapters(
        initial?.chapters?.length ? initial.chapters : [EMPTY_CHAPTER()],
      );
      setErrors({});
    };

    resetForm();

    if (!initial?.levelId) return;

    let cancelled = false;
    const resolveStream =
      initial.programId != null
        ? getLevelsByProgram(initial.programId)
        : getAllStreams().then(async (allStreams) => {
            for (const stream of allStreams) {
              const streamLevels = await getLevelsByStream(stream.id);
              if (streamLevels.some((level) => level.id === initial.levelId)) {
                return streamLevels;
              }
            }
            return [];
          });

    void resolveStream.then((programLevels) => {
      if (cancelled) return;
      const matched = programLevels.find((level) => level.id === initial.levelId);
      if (matched) {
        setStreamId(matched.streamId);
        setLevelId(matched.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, initial]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nextErrors: Record<string, string> = {};
      if (!streamId) nextErrors.streamId = "Stream is required";
      if (!levelId) nextErrors.levelId = "Level is required";
      const programId = selectedStream?.programId;
      if (!programId) nextErrors.streamId = "Selected stream has no program";
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        throw new Error("Please complete stream and level");
      }

      const payload = {
        title: title.trim(),
        programId: programId!,
        levelId,
        subject: subject.trim(),
        totalPages: Number(totalPages),
        description: description.trim() || undefined,
        chapters: chapters
          .filter((c) => c.title.trim())
          .map((c, index) => ({
            title: c.title.trim(),
            pageFrom: Number(c.pageFrom),
            pageTo: Number(c.pageTo),
            sortOrder: index,
          })),
      };
      if (initial?.id) return updateAdminBook(initial.id, payload);
      return createAdminBook(payload);
    },
    onSuccess: () => {
      toast.success(initial?.id ? "Book updated" : "Book created");
      onSaved();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (err.message !== "Please complete stream and level") {
        toast.error(err.message || "Failed to save book");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Book" : "Add Book"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bookStream">Stream *</Label>
              <Select
                value={streamId > 0 ? String(streamId) : ""}
                onValueChange={(value) => {
                  setStreamId(Number(value));
                  setLevelId(0);
                  if (errors.streamId) {
                    setErrors((prev) => ({ ...prev, streamId: "" }));
                  }
                }}
                disabled={loadingStreams}
              >
                <SelectTrigger
                  id="bookStream"
                  className={errors.streamId ? "border-red-500" : ""}
                >
                  <SelectValue
                    placeholder={
                      loadingStreams ? "Loading streams..." : "Select stream"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {streams.map((stream) => (
                    <SelectItem key={stream.id} value={String(stream.id)}>
                      {stream.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.streamId && (
                <p className="text-red-500 text-sm">{errors.streamId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookLevel">Level *</Label>
              <Select
                value={levelId > 0 ? String(levelId) : ""}
                onValueChange={(value) => {
                  setLevelId(Number(value));
                  if (errors.levelId) {
                    setErrors((prev) => ({ ...prev, levelId: "" }));
                  }
                }}
                disabled={!streamId || loadingLevels}
              >
                <SelectTrigger
                  id="bookLevel"
                  className={errors.levelId ? "border-red-500" : ""}
                >
                  <SelectValue
                    placeholder={
                      loadingLevels
                        ? "Loading levels..."
                        : !streamId
                          ? "Select stream first"
                          : "Select level"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.id} value={String(level.id)}>
                      {level.name ? `${level.name} (${level.code})` : level.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.levelId && (
                <p className="text-red-500 text-sm">{errors.levelId}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Pages *</Label>
              <Input type="number" min={1} value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Chapters</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setChapters((prev) => [...prev, EMPTY_CHAPTER()])}>
                + Add Chapter
              </Button>
            </div>
            {chapters.map((chapter, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input value={chapter.title} onChange={(e) => setChapters((prev) => prev.map((c, i) => i === index ? { ...c, title: e.target.value } : c))} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input type="number" min={1} value={chapter.pageFrom} onChange={(e) => setChapters((prev) => prev.map((c, i) => i === index ? { ...c, pageFrom: Number(e.target.value) } : c))} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input type="number" min={1} value={chapter.pageTo} onChange={(e) => setChapters((prev) => prev.map((c, i) => i === index ? { ...c, pageTo: Number(e.target.value) } : c))} />
                </div>
                <div className="col-span-3">
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setChapters((prev) => prev.filter((_, i) => i !== index))}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookMasterSection() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LearningBook | null>(null);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["admin-learning-books"],
    queryFn: async () => {
      const rows = await fetchAdminBooks(true);
      return Array.isArray(rows) ? rows : [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-learning-books"] });

  const deactivateMutation = useMutation({
    mutationFn: deactivateAdminBook,
    onSuccess: () => { toast.success("Book deactivated"); invalidate(); },
  });
  const activateMutation = useMutation({
    mutationFn: activateAdminBook,
    onSuccess: () => { toast.success("Book activated"); invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAdminBook,
    onSuccess: () => { toast.success("Book deleted"); invalidate(); },
    onError: (err: Error) => toast.error(err.message || "Cannot delete book"),
  });

  const columns: DataTableColumn<LearningBook>[] = useMemo(
    () => [
      {
        key: "subject",
        header: "Subject",
        render: (row) => row.subject,
      },
      {
        key: "pages",
        header: "Pages",
        render: (row) => row.totalPages,
      },
      {
        key: "chapters",
        header: "Chapters",
        render: (row) => row.chapters?.length ?? 0,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge variant={row.isActive ? "default" : "secondary"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <div className="flex justify-end gap-1">
            <RowActionButton icon={Edit} label="Edit" onClick={() => { setEditing(row); setDialogOpen(true); }} />
            {row.isActive ? (
              <RowActionButton icon={Power} label="Deactivate" onClick={() => deactivateMutation.mutate(row.id)} />
            ) : (
              <RowActionButton icon={Power} label="Activate" onClick={() => activateMutation.mutate(row.id)} />
            )}
            <RowActionButton icon={Trash2} label="Delete" tone="destructive" onClick={() => {
              if (confirm("Delete this book permanently?")) deleteMutation.mutate(row.id);
            }} />
          </div>
        ),
      },
    ],
    [activateMutation, deactivateMutation, deleteMutation],
  );

  return (
    <TablePageShell
      title="Book Master"
      description="Manage books and learning content available across all centers."
      actions={
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Book
        </Button>
      }
    >
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={books}
          loading={isLoading}
          columns={columns}
          getRowId={(row) => String(row.id)}
          renderMainCell={(row) => (
            <TableMainCell
              title={row.title}
              subtitle={`${row.programName ?? "Program"} • ${row.levelName ?? "Level"}`}
            />
          )}
          emptyMessage="No books yet."
        />
      )}
      <BookFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={invalidate}
      />
    </TablePageShell>
  );
}

export default function AdminBookMasterPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BookMasterSection />
    </Suspense>
  );
}
