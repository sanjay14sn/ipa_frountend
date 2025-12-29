"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  getStreamsByProgram,
  createStream,
  updateStream,
  deleteStream,
  type Stream,
  type CreateStreamDto,
  type UpdateStreamDto,
} from "@/services/stream.service";
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

interface StreamManagementProps {
  programId: number;
  programName: string;
}

export function StreamManagement({
  programId,
  programName,
}: StreamManagementProps) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [deletingStream, setDeletingStream] = useState<Stream | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
  });

  const [editFormData, setEditFormData] = useState<UpdateStreamDto>({});

  useEffect(() => {
    loadStreams();
  }, [programId]);

  const loadStreams = async () => {
    try {
      const data = await getStreamsByProgram(programId);
      setStreams(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load streams",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      isActive: true,
    });
  };

  const handleAddStream = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Stream name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createStream({
        ...formData,
        programId,
      } as CreateStreamDto);
      toast({
        title: "Success",
        description: "Stream created successfully",
      });
      resetForm();
      setIsAddDialogOpen(false);
      loadStreams();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create stream",
        variant: "destructive",
      });
    }
  };

  const handleEditStream = async () => {
    if (!editingStream) return;

    try {
      await updateStream(editingStream.id, editFormData);
      toast({
        title: "Success",
        description: "Stream updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingStream(null);
      setEditFormData({});
      loadStreams();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stream",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStream = async () => {
    if (!deletingStream) return;

    try {
      await deleteStream(deletingStream.id);
      toast({
        title: "Success",
        description: "Stream deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeletingStream(null);
      loadStreams();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete stream. Make sure no levels are associated with it.",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(streams.length / itemsPerPage);
  const paginatedStreams = streams.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns: AdminTableColumn<Stream>[] = [
    {
      key: "name",
      label: "Stream Name",
      sortable: true,
      render: (stream: Stream) => (
        <div className="font-medium text-gray-900">{stream.name}</div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (stream: Stream) => (
        <Badge variant={stream.isActive ? "default" : "secondary"}>
          {stream.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (stream: Stream) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingStream(stream);
              setEditFormData({
                name: stream.name,
                isActive: stream.isActive,
              });
              setIsEditDialogOpen(true);
            }}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeletingStream(stream);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
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
            Streams for {programName}
          </h3>
          <Badge variant="secondary">{streams.length}</Badge>
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
          Add Stream
        </Button>
      </div>

      <AdminTable
        data={paginatedStreams}
        loading={isLoading}
        columns={columns}
        getRowId={(stream) => stream.id.toString()}
        renderMainCell={(stream) => (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">{stream.name}</div>
            <div className="text-sm text-gray-500">
              {stream.isActive ? "Active stream" : "Inactive stream"}
            </div>
          </div>
        )}
        pagination={{ total: streams.length, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        emptyMessage={`No streams found for ${programName}. Add a stream to get started.`}
        resultsText={(count, total) => `Showing ${count} of ${total} streams`}
      />

      {/* Add Stream Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Stream</DialogTitle>
            <DialogDescription>
              Create a new stream (e.g., Elementary, Regular) for {programName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Stream Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Elementary, Regular, Advanced"
              />
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
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddStream}>Create Stream</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stream Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stream</DialogTitle>
            <DialogDescription>
              Update the stream details for {editingStream?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Stream Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                placeholder="Stream name"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={editFormData.isActive ?? true}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, isActive: checked })
                }
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingStream(null);
                setEditFormData({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditStream}>Update Stream</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the stream &quot;{deletingStream?.name}&quot;.
              All levels under this stream will also be affected. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingStream(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStream}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

