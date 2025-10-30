"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AdminTable } from "@/components/shared";
import type { AdminTableColumn } from "@/components/shared/AdminTable";
import {
  getLevelsByProgram,
  createLevel,
  updateLevel,
  deleteLevel,
  type Level,
  type CreateLevelDto,
  type UpdateLevelDto,
} from "@/services/level.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { InventoryManagement } from "./InventoryManagement";

interface LevelManagementProps {
  programId: number;
  programName: string;
}

export function LevelManagement({
  programId,
  programName,
}: LevelManagementProps) {
  const router = useRouter();
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<Level | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const itemsPerPage = 10;

  const [formData, setFormData] = useState<Omit<CreateLevelDto, "programId">>({
    name: "",
    code: "",
    totalMarks: 100,
    passMark: 40,
    displayOrder: 1,
    isActive: true,
  });

  const [editFormData, setEditFormData] = useState<UpdateLevelDto>({});

  useEffect(() => {
    loadLevels();
  }, [programId]);

  const loadLevels = async () => {
    try {
      const data = await getLevelsByProgram(programId);
      setLevels(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load levels",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      totalMarks: 100,
      passMark: 40,
      displayOrder: levels.length + 1,
      isActive: true,
    });
  };

  const handleAddLevel = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Error",
        description: "Name and code are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createLevel({
        ...formData,
        programId,
      });
      toast({
        title: "Success",
        description: "Level created successfully",
      });
      resetForm();
      setIsAddDialogOpen(false);
      loadLevels();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create level",
        variant: "destructive",
      });
    }
  };

  const handleEditLevel = async () => {
    if (!editingLevel) return;

    try {
      await updateLevel(editingLevel.id, editFormData);
      toast({
        title: "Success",
        description: "Level updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingLevel(null);
      setEditFormData({});
      loadLevels();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update level",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLevel = async () => {
    if (!deletingLevel) return;

    try {
      await deleteLevel(deletingLevel.id);
      toast({
        title: "Success",
        description: "Level deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeletingLevel(null);
      loadLevels();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete level",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(levels.length / itemsPerPage);
  const paginatedLevels = levels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns: AdminTableColumn<Level>[] = [
    {
      key: "level",
      header: "Level",
      className: "w-[250px]",
    },
    {
      key: "code",
      header: "Code",
      className: "text-center",
      render: (level) => <Badge variant="outline">{level.code}</Badge>,
    },
    {
      key: "marks",
      header: "Pass/Total Marks",
      className: "text-center",
      render: (level) => (
        <span>
          {level.passMark}/{level.totalMarks}
        </span>
      ),
    },
    {
      key: "order",
      header: "Order",
      className: "text-center",
      render: (level) => <span>#{level.displayOrder}</span>,
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (level) => (
        <Badge
          className={
            level.isActive
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-gray-100 text-gray-600 border-gray-200"
          }
        >
          {level.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (level) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/inventory?programId=${programId}&levelId=${level.id}`);
            }}
            title="View Inventory"
          >
            <Package className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingLevel(level);
              setEditFormData({
                name: level.name,
                code: level.code,
                totalMarks: level.totalMarks,
                passMark: level.passMark,
                displayOrder: level.displayOrder,
                isActive: level.isActive,
              });
              setIsEditDialogOpen(true);
            }}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingLevel(level);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Levels for {programName}
          </h3>
          <Badge variant="secondary">{levels.length}</Badge>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Level
        </Button>
      </div>

      <AdminTable
        data={paginatedLevels}
        loading={isLoading}
        columns={columns}
        getRowId={(level) => level.id.toString()}
        renderMainCell={(level) => (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">{level.name}</div>
            <div className="text-sm text-gray-500">
              {level.code} • {level.isActive ? "Active" : "Inactive"}
            </div>
          </div>
        )}
        renderExpandedContent={(level) => (
          <div className="bg-gray-50 p-6 border-t">
            <InventoryManagement
              programId={programId}
              levelId={level.id}
              levelName={level.name}
            />
          </div>
        )}
        pagination={{ total: levels.length, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        emptyMessage={`No levels found for ${programName}. Add a level to get started.`}
        resultsText={(count, total) => `Showing ${count} of ${total} levels`}
      />

      {/* Add Level Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Level</DialogTitle>
            <DialogDescription>
              Create a new level for {programName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Level Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Level 1"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., RL1"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalMarks">Total Marks</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalMarks: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passMark">Pass Mark</Label>
                <Input
                  id="passMark"
                  type="number"
                  value={formData.passMark}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passMark: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      displayOrder: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddLevel}
              className="bg-primary hover:bg-brand-green-600"
            >
              Create Level
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Level Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Level</DialogTitle>
            <DialogDescription>Update level details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Level Name</Label>
                <Input
                  id="editName"
                  value={editFormData.name || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCode">Code</Label>
                <Input
                  id="editCode"
                  value={editFormData.code || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, code: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTotalMarks">Total Marks</Label>
                <Input
                  id="editTotalMarks"
                  type="number"
                  value={editFormData.totalMarks || 0}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      totalMarks: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPassMark">Pass Mark</Label>
                <Input
                  id="editPassMark"
                  type="number"
                  value={editFormData.passMark || 0}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      passMark: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDisplayOrder">Display Order</Label>
                <Input
                  id="editDisplayOrder"
                  type="number"
                  value={editFormData.displayOrder || 0}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      displayOrder: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="editIsActive"
                  checked={editFormData.isActive ?? false}
                  onCheckedChange={(checked) =>
                    setEditFormData({ ...editFormData, isActive: checked })
                  }
                />
                <Label htmlFor="editIsActive">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditLevel}
              className="bg-primary hover:bg-brand-green-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Level Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the level "{deletingLevel?.name}".
              This action cannot be undone and will also delete all associated
              inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLevel}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
