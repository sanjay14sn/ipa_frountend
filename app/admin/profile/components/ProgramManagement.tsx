"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  type Program,
} from "@/services/program.service";
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
import { AdminTable } from "@/components/shared";
import type { AdminTableColumn } from "@/components/shared/AdminTable";
import { LevelManagement } from "./LevelManagement";

export function ProgramManagement() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editProgramName, setEditProgramName] = useState("");
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const data = await getAllPrograms();
      setPrograms(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load programs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProgram = async () => {
    if (!newProgramName.trim()) {
      toast({
        title: "Error",
        description: "Program name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await createProgram(newProgramName.trim());
      toast({
        title: "Success",
        description: "Program created successfully",
      });
      setNewProgramName("");
      setIsAddDialogOpen(false);
      loadPrograms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create program",
        variant: "destructive",
      });
    }
  };

  const handleEditProgram = async () => {
    if (!editingProgram || !editProgramName.trim()) {
      toast({
        title: "Error",
        description: "Program name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProgram(editingProgram.id, editProgramName.trim());
      toast({
        title: "Success",
        description: "Program updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingProgram(null);
      setEditProgramName("");
      loadPrograms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update program",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProgram = async () => {
    if (!deletingProgram) return;

    try {
      await deleteProgram(deletingProgram.id);
      toast({
        title: "Success",
        description: "Program deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeletingProgram(null);
      loadPrograms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete program. It may have associated levels.",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(programs.length / itemsPerPage);
  const paginatedPrograms = programs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns: AdminTableColumn<Program>[] = [
    {
      key: "program",
      header: "Program",
      className: "w-[300px]",
    },
    {
      key: "id",
      header: "Program ID",
      className: "text-center",
      render: (program) => <Badge variant="outline">ID: {program.id}</Badge>,
    },
    {
      key: "createdDate",
      header: "Created Date",
      className: "text-center",
      render: (program) =>
        program.createdAt
          ? new Date(program.createdAt).toLocaleDateString()
          : "N/A",
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (program) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingProgram(program);
              setEditProgramName(program.name);
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
              setDeletingProgram(program);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg border">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Programs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure programs and their hierarchical structure
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Program
        </Button>
      </div>

      <AdminTable
        data={paginatedPrograms}
        loading={isLoading}
        columns={columns}
        getRowId={(program) => program.id.toString()}
        renderMainCell={(program) => (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">{program.name}</div>
            <div className="text-sm text-gray-500">
              Program configuration and level management
            </div>
          </div>
        )}
        renderExpandedContent={(program) => (
          <div className="bg-gray-50 p-6 border-t">
            <LevelManagement
              programId={program.id}
              programName={program.name}
            />
          </div>
        )}
        pagination={{ total: programs.length, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        emptyMessage="No programs found. Create your first program to get started."
        resultsText={(count, total) => `Showing ${count} of ${total} programs`}
      />

      {/* Add Program Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Program</DialogTitle>
            <DialogDescription>
              Create a new program. You can add levels and inventory to it
              later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="programName">Program Name</Label>
              <Input
                id="programName"
                placeholder="e.g., Reading Literacy"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddProgram()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddProgram}
              className="bg-primary hover:bg-brand-green-600"
            >
              Create Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>Update the program name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editProgramName">Program Name</Label>
              <Input
                id="editProgramName"
                value={editProgramName}
                onChange={(e) => setEditProgramName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditProgram()}
              />
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
              onClick={handleEditProgram}
              className="bg-primary hover:bg-brand-green-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Program Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the program "{deletingProgram?.name}
              ". This action cannot be undone and will also delete all
              associated levels and inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProgram}
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
