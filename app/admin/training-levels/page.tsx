"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, BookOpen, X, ChevronDown } from "lucide-react";
import {
  getAllTrainingLevels,
  createTrainingLevel,
  updateTrainingLevel,
  deleteTrainingLevel,
  TrainingLevel,
  LinkedLevel,
} from "@/services/training-level.service";
import { getAllPrograms, Program } from "@/services/program.service";
import { getLevelsByProgram, Level } from "@/services/level.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const emptyForm = {
  name: "",
  description: "",
  isActive: true,
  amount: 0,
  durationMonths: 2,
  rank: undefined as number | undefined,
};

export default function TrainingLevelsPage() {
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<TrainingLevel | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  // Selected linked levels tracked as full objects for badge display + ID submission
  const [selectedLinkedLevels, setSelectedLinkedLevels] = useState<LinkedLevel[]>([]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [programLevels, setProgramLevels] = useState<Level[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);

  useEffect(() => {
    fetchTrainingLevels();
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      fetchLevelsByProgram(selectedProgramId);
    } else {
      setProgramLevels([]);
    }
  }, [selectedProgramId]);

  const fetchPrograms = async () => {
    try {
      const data = await getAllPrograms();
      setPrograms(data);
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchLevelsByProgram = async (programId: number) => {
    try {
      setLoadingLevels(true);
      const data = await getLevelsByProgram(programId);
      const activeLevels = data
        .filter((level) => level.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      setProgramLevels(activeLevels);
    } catch (error) {
      console.error("Error fetching levels:", error);
      setProgramLevels([]);
    } finally {
      setLoadingLevels(false);
    }
  };

  const groupedLevelsByOrder = programLevels.reduce(
    (acc, level) => {
      const order = level.displayOrder;
      if (!acc[order]) acc[order] = [];
      acc[order].push(level);
      return acc;
    },
    {} as Record<number, Level[]>
  );

  const fetchTrainingLevels = async () => {
    try {
      setLoading(true);
      const data = await getAllTrainingLevels();
      setTrainingLevels(data);
    } catch (error) {
      console.error("Error fetching training levels:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setSelectedLevel(null);
    setSelectedLinkedLevels([]);
    setSelectedProgramId(null);
    setProgramLevels([]);
    setFormData({ ...emptyForm });
  };

  const handleOpenDialog = (level?: TrainingLevel) => {
    if (level) {
      setSelectedLevel(level);
      setFormData({
        name: level.name || "",
        description: level.description || "",
        isActive: level.isActive ?? true,
        amount: level.amount ?? 0,
        durationMonths: level.durationMonths ?? 2,
        rank: level.rank ?? undefined,
      });
      // Pre-populate selected levels from the API's linkedLevels enrichment
      setSelectedLinkedLevels(level.linkedLevels ?? []);
      setSelectedProgramId(null);
    } else {
      resetDialog();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetDialog();
  };

  const toggleLevelSelection = (level: Level) => {
    setSelectedLinkedLevels((prev) => {
      if (prev.some((l) => l.id === level.id)) {
        return prev.filter((l) => l.id !== level.id);
      }
      return [...prev, { id: level.id, code: level.code, name: level.name }];
    });
  };

  const removeLinkedLevel = (id: number) => {
    setSelectedLinkedLevels((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a name for this training level.");
      return;
    }

    const payload: Partial<TrainingLevel> = {
      ...formData,
      name: formData.name.trim(),
      levelIds: selectedLinkedLevels.map((l) => l.id),
    };

    try {
      if (selectedLevel) {
        await updateTrainingLevel(selectedLevel.id, payload);
      } else {
        await createTrainingLevel(payload);
      }
      await fetchTrainingLevels();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving training level:", error);
      alert("Failed to save training level. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!selectedLevel) return;
    try {
      await deleteTrainingLevel(selectedLevel.id);
      await fetchTrainingLevels();
      setIsDeleteDialogOpen(false);
      setSelectedLevel(null);
    } catch (error) {
      console.error("Error deleting training level:", error);
      alert("Failed to delete training level. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Training Levels Management
          </h1>
          <p className="text-muted-foreground">
            Manage training levels for course instructors
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Training Level
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {selectedLevel ? "Edit Training Level" : "Add Training Level"}
                </DialogTitle>
                <DialogDescription>
                  {selectedLevel
                    ? "Update the training level details"
                    : "Create a new training level for course instructors"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Name — now a freely editable field */}
                <div className="space-y-2">
                  <Label htmlFor="tl-name">Name *</Label>
                  <Input
                    id="tl-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. EL2 + RL2 Training"
                    required
                  />
                </div>

                {/* Linked student levels via junction table */}
                <div className="space-y-2">
                  <Label>Linked student levels</Label>
                  <div className="space-y-3">
                    {selectedLinkedLevels.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[48px]">
                        {selectedLinkedLevels.map((l) => (
                          <Badge
                            key={l.id}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-1"
                          >
                            {l.code}
                            <button
                              type="button"
                              onClick={() => removeLinkedLevel(l.id)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Program selector to load levels */}
                    <Select
                      value={selectedProgramId?.toString() || ""}
                      onValueChange={(value) =>
                        setSelectedProgramId(Number(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a program to pick levels" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem
                            key={program.id}
                            value={program.id.toString()}
                          >
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedProgramId ? (
                      <Popover
                        open={isPopoverOpen}
                        onOpenChange={setIsPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                            disabled={
                              loadingLevels || programLevels.length === 0
                            }
                          >
                            {loadingLevels
                              ? "Loading levels…"
                              : programLevels.length === 0
                              ? "No levels available for this program"
                              : "Add levels from program"}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[400px] p-0"
                          align="start"
                        >
                          <div className="p-2 max-h-[300px] overflow-y-auto space-y-3">
                            {Object.entries(groupedLevelsByOrder)
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([displayOrder, levels]) => (
                                <div key={displayOrder} className="space-y-1">
                                  <div className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded">
                                    Display Order: {displayOrder}
                                  </div>
                                  <div className="flex flex-wrap gap-2 px-2">
                                    {levels.map((level) => (
                                      <div
                                        key={level.id}
                                        className="flex items-center space-x-1 p-2 hover:bg-accent rounded cursor-pointer border border-border"
                                        onClick={() =>
                                          toggleLevelSelection(level)
                                        }
                                      >
                                        <Checkbox
                                          checked={selectedLinkedLevels.some(
                                            (l) => l.id === level.id
                                          )}
                                          onCheckedChange={() =>
                                            toggleLevelSelection(level)
                                          }
                                        />
                                        <label className="text-sm cursor-pointer whitespace-nowrap">
                                          {level.code} — {level.name}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Select a program above to pick student levels from the
                        catalog.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter description for this training level"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      formData.amount === 0 ||
                      formData.amount === undefined ||
                      formData.amount === null
                        ? ""
                        : formData.amount
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        amount: val === "" ? 0 : parseFloat(val) || 0,
                      });
                    }}
                    placeholder="Enter training level amount"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Set the training fee amount for this level (default: 0)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationMonths">Duration (months) *</Label>
                  <Input
                    id="durationMonths"
                    type="number"
                    min={1}
                    step={1}
                    value={
                      formData.durationMonths === undefined ||
                      formData.durationMonths === null
                        ? ""
                        : formData.durationMonths
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        durationMonths:
                          val === "" ? 2 : Math.max(1, parseInt(val, 10) || 2),
                      });
                    }}
                    placeholder="2"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    How long this CI training level runs (default: 2 months)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rank">Rank/Order</Label>
                  <Input
                    id="rank"
                    type="number"
                    min="1"
                    value={
                      formData.rank === 0 ||
                      formData.rank === undefined ||
                      formData.rank === null
                        ? ""
                        : formData.rank
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        rank: val === "" ? undefined : parseInt(val),
                      });
                    }}
                    placeholder="Enter rank/order (optional)"
                  />
                  <p className="text-sm text-muted-foreground">
                    Lower numbers appear first. Leave empty for no specific
                    order.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedLevel ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">
          Loading training levels...
        </div>
      ) : trainingLevels.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No training levels found. Create your first training level.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Linked Levels</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Amount (₹)</TableHead>
                <TableHead className="text-center">Duration (months)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainingLevels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell>
                    {level.rank != null ? (
                      <span className="font-medium">{level.rank}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{level.name}</TableCell>
                  <TableCell>
                    {level.linkedLevels && level.linkedLevels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {level.linkedLevels.map((l) => (
                          <Badge key={l.id} variant="outline" className="text-xs">
                            {l.code}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {level.description || (
                      <span className="text-muted-foreground">
                        No description
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    ₹
                    {Number(level.amount ?? 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {level.durationMonths ?? 2}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        level.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {level.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(level)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLevel(level);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              training level &quot;{selectedLevel?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
