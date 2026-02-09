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

export default function TrainingLevelsPage() {
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<TrainingLevel | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    amount: 0,
    rank: undefined as number | undefined,
  });
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [newLevelInput, setNewLevelInput] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
    null
  );
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
      // Filter active levels and sort by display order
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

  // Group levels by display order
  const groupedLevelsByOrder = programLevels.reduce((acc, level) => {
    const order = level.displayOrder;
    if (!acc[order]) {
      acc[order] = [];
    }
    acc[order].push(level);
    return acc;
  }, {} as Record<number, Level[]>);

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

  const handleOpenDialog = (level?: TrainingLevel) => {
    if (level) {
      setSelectedLevel(level);
      // Parse existing levels from comma-separated string (for display)
      const levels = level.name
        ? level.name
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : [];
      setSelectedLevels(levels);
      // Populate all fields including rank
      setFormData({
        name: level.name || "",
        description: level.description || "",
        isActive: level.isActive ?? true,
        amount: level.amount ?? 0,
        rank: level.rank ?? undefined,
      });
      // Don't reset program selection when editing - allow editing without program
      // Keep existing program selection if any
    } else {
      setSelectedLevel(null);
      setSelectedLevels([]);
      setSelectedProgramId(null);
      setProgramLevels([]);
      setFormData({
        name: "",
        description: "",
        isActive: true,
        amount: 0,
        rank: undefined,
      });
    }
    setNewLevelInput("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedLevel(null);
    setSelectedLevels([]);
    setNewLevelInput("");
    setSelectedProgramId(null);
    setProgramLevels([]);
    setFormData({
      name: "",
      description: "",
      isActive: true,
      amount: 0,
      rank: undefined,
    });
  };

  const toggleLevelSelection = (level: string) => {
    setSelectedLevels((prev) => {
      if (prev.includes(level)) {
        const updated = prev.filter((item) => item !== level);
        setFormData((form) => ({
          ...form,
          name: updated.join(", "),
        }));
        return updated;
      } else {
        const updated = [...prev, level];
        setFormData((form) => ({
          ...form,
          name: updated.join(", "),
        }));
        return updated;
      }
    });
  };

  const removeLevel = (level: string) => {
    setSelectedLevels((prev) => {
      const updated = prev.filter((item) => item !== level);
      setFormData((form) => ({
        ...form,
        name: updated.join(", "),
      }));
      return updated;
    });
  };

  const addCustomLevel = () => {
    const trimmed = newLevelInput.trim();
    if (trimmed && !selectedLevels.includes(trimmed)) {
      const updated = [...selectedLevels, trimmed];
      setSelectedLevels(updated);
      setFormData((form) => ({
        ...form,
        name: updated.join(", "),
      }));
      setNewLevelInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate program selection for new training levels
    if (!selectedLevel && !selectedProgramId) {
      alert("Please select a program.");
      return;
    }

    // Only validate level selection for new training levels
    if (!selectedLevel && selectedLevels.length === 0) {
      alert("Please select at least one training level.");
      return;
    }

    // Ensure formData.name is updated with selected levels (only for new entries)
    // For editing, use the existing name or the selected levels
    const updatedFormData = {
      ...formData,
      name: selectedLevel ? formData.name : selectedLevels.join(", "),
      description: formData.description || "",
      isActive: formData.isActive ?? true,
      amount: formData.amount ?? 0,
      rank: formData.rank || undefined,
    };

    try {
      if (selectedLevel) {
        await updateTrainingLevel(selectedLevel.id, updatedFormData);
      } else {
        await createTrainingLevel(updatedFormData);
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
                {!selectedLevel && (
                <div className="space-y-2">
                  <Label>Program *</Label>
                  <Select
                    value={selectedProgramId?.toString() || ""}
                    onValueChange={(value) => {
                      setSelectedProgramId(Number(value));
                      setSelectedLevels([]);
                      setFormData((form) => ({ ...form, name: "" }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a program" />
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
                  <p className="text-xs text-muted-foreground">
                    Select a program to view its levels
                  </p>
                </div>
                )}

                {selectedLevel ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter training level name"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Training Levels *</Label>
                    <div className="space-y-3">
                      {/* Selected Levels Display */}
                      {selectedLevels.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
                          {selectedLevels.map((level) => (
                            <Badge
                              key={level}
                              variant="secondary"
                              className="flex items-center gap-1 px-2 py-1"
                            >
                              {level}
                              <button
                                type="button"
                                onClick={() => removeLevel(level)}
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Level Selection Popover */}
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
                                ? "Loading levels..."
                                : programLevels.length === 0
                                ? "No levels available for this program"
                                : "Select levels from program"}
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <div className="p-2">
                              {programLevels.length > 0 ? (
                                <div className="max-h-[300px] overflow-y-auto space-y-3">
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
                                                toggleLevelSelection(level.code)
                                              }
                                            >
                                              <Checkbox
                                                checked={selectedLevels.includes(
                                                  level.code
                                                )}
                                                onCheckedChange={() =>
                                                  toggleLevelSelection(level.code)
                                                }
                                              />
                                              <label className="text-sm cursor-pointer whitespace-nowrap">
                                                {level.code} - {level.name}
                                              </label>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground p-2">
                                  No levels found for this program
                                </p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="p-3 border rounded-md text-sm text-muted-foreground text-center">
                          Please select a program first
                        </div>
                      )}

                      {/* Add Custom Level */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add custom level (e.g., RL1, EL1)"
                          value={newLevelInput}
                          onChange={(e) => setNewLevelInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomLevel();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCustomLevel}
                          disabled={!newLevelInput.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Hidden input for form validation */}
                      <Input type="hidden" value={formData.name} required />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select from existing levels or add custom ones. Selected
                      levels will be combined.
                    </p>
                  </div>
                )}
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
                    value={formData.amount === 0 || formData.amount === undefined || formData.amount === null ? "" : formData.amount}
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
                  <Label htmlFor="rank">Rank/Order</Label>
                  <Input
                    id="rank"
                    type="number"
                    min="1"
                    value={formData.rank === 0 || formData.rank === undefined || formData.rank === null ? "" : formData.rank}
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
                    Lower numbers appear first. Leave empty for no specific order.
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
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainingLevels?.map((level: TrainingLevel) => (
                <TableRow key={level.id}>
                  <TableCell>
                    {level.rank !== null && level.rank !== undefined ? (
                      <span className="font-medium">{level.rank}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{level.name}</TableCell>
                  <TableCell>
                    {level.description || (
                      <span className="text-muted-foreground">
                        No description
                      </span>
                    )}
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
              training level "{selectedLevel?.name}".
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
