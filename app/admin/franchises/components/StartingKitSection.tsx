import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  X,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import {
  getFranchiseProgramKits,
  getAllFranchiseProgramKits,
  assignFranchiseKits,
  type FranchiseProgramKit,
} from "@/services/starting-kit.service";
import {
  getProgramKits,
  createProgramKit,
  deleteProgramKit,
  type ProgramKit,
} from "@/services/starting-kit.service";
import { createInventory } from "@/services/inventory.service";
import { 
  getInventoryCategories,
  type InventoryCategory 
} from "@/services/inventory-category.service";
import { CategorySelect } from "@/components/inventory/CategorySelect";
import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { FranchiseData } from "@/services/franchisee.service";

interface StartingKitSectionProps {
  franchise: FranchiseData;
  clientId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export const startingKitDotRef = React.createRef<HTMLDivElement>();

export default function StartingKitSection({
  franchise,
  clientId,
  isExpanded,
  onToggle,
}: StartingKitSectionProps) {
  const sectionId = `${clientId}-starting-kit`;
  const containerRef = useRef<HTMLDivElement>(null);
  const startingKitInternalDotRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kitData, setKitData] = useState<
    Record<number, FranchiseProgramKit[]>
  >({});
  const [programKits, setProgramKits] = useState<
    Record<number, ProgramKit[]>
  >({});
  const [isKitDialogOpen, setIsKitDialogOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
    null
  );
  const [newKitInventoryId, setNewKitInventoryId] = useState<number | "">("");
  const [newKitQuantity, setNewKitQuantity] = useState<number>(1);
  const [isCreatingInventory, setIsCreatingInventory] = useState(false);
  const [newInventoryName, setNewInventoryName] = useState("");
  const [newInventoryDescription, setNewInventoryDescription] = useState("");
  const [newInventoryCategory, setNewInventoryCategory] = useState<string>("");
  const [newInventoryQuantity, setNewInventoryQuantity] = useState<number>(0);
  const [newInventoryRestockQuantity, setNewInventoryRestockQuantity] =
    useState<number>(0);
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([]);
  const { toast } = useToast();

  const franchisePrograms = franchise.franchisePrograms || [];

  useEffect(() => {
    if (isExpanded) {
      loadKitData();
    }
  }, [isExpanded, franchise.id]);

  useEffect(() => {
    loadInventoryCategories();
  }, []);

  const loadKitData = async () => {
    setIsLoading(true);
    try {
      const kitsData: Record<number, FranchiseProgramKit[]> = {};
      const programKitsData: Record<number, ProgramKit[]> = {};

      for (const fp of franchisePrograms) {
        try {
          // Load franchise-specific kits
          const franchiseKits = await getFranchiseProgramKits(
            franchise.id,
            fp.program.id
          );
          kitsData[fp.program.id] = franchiseKits;

          // Load default program kits
          const defaultKits = await getProgramKits(fp.program.id);
          programKitsData[fp.program.id] = defaultKits;
        } catch (error) {
          console.error(
            `Error loading kits for program ${fp.program.id}:`,
            error
          );
          kitsData[fp.program.id] = [];
          programKitsData[fp.program.id] = [];
        }
      }

      setKitData(kitsData);
      setProgramKits(programKitsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load starting kit items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadInventoryCategories = async () => {
    try {
      const data = await getInventoryCategories();
      setInventoryCategories(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inventory categories",
        variant: "destructive",
      });
    }
  };

  const handleCategoryAdded = async (newCategory: InventoryCategory) => {
    // Reload categories to include the new one
    await loadInventoryCategories();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadKitData(); // Reload to reset changes
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Build kit assignment data
      const programKitsArray = franchisePrograms.map((fp) => ({
        programId: fp.program.id,
        kitItems: (kitData[fp.program.id] || []).map((kit) => ({
          inventoryId: kit.inventoryId,
          quantity: kit.quantity,
        })),
      }));

      await assignFranchiseKits({
        franchiseId: franchise.id,
        programKits: programKitsArray,
      });

      toast({
        title: "Success",
        description: "Starting kit items updated successfully",
      });

      setIsEditing(false);
      loadKitData();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update kit items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKitItem = (programId: number, inventoryId: number) => {
    setKitData((prev) => ({
      ...prev,
      [programId]: (prev[programId] || []).filter(
        (kit) => kit.inventoryId !== inventoryId
      ),
    }));
  };

  const handleAddKitItem = (programId: number) => {
    setSelectedProgramId(programId);
    setNewKitInventoryId("");
    setNewKitQuantity(1);
    setIsKitDialogOpen(true);
  };

  const handleCreateAndAddKitItem = async () => {
    if (!selectedProgramId) return;

    if (!newInventoryName.trim() || !newInventoryCategory || newKitQuantity < 1) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingInventory(true);

    try {
      // Create new inventory item
      const newInventory = await createInventory({
        name: newInventoryName.trim(),
        description: newInventoryDescription.trim() || "",
        categoryId: Number(newInventoryCategory),
        quantity: newInventoryQuantity || 0,
        restockQuantity: newInventoryRestockQuantity || 0,
        programId: selectedProgramId,
        isActive: true,
      });

      // Add to kit data
      setKitData((prev) => ({
        ...prev,
        [selectedProgramId]: [
          ...(prev[selectedProgramId] || []),
          {
            id: 0, // Temporary ID
            franchiseId: franchise.id,
            programId: selectedProgramId,
            inventoryId: newInventory.id,
            quantity: newKitQuantity,
            inventory: {
              id: newInventory.id,
              name: newInventory.name,
              description: newInventory.description,
              categoryId: newInventory.categoryId,
              category: newInventory.category,
            },
          } as FranchiseProgramKit,
        ],
      }));

      toast({
        title: "Success",
        description: "Kit item created and added",
      });

      // Reset form
      setNewInventoryName("");
      setNewInventoryDescription("");
      setNewInventoryCategory("");
      setNewInventoryQuantity(0);
      setNewInventoryRestockQuantity(0);
      setNewKitQuantity(1);
      setIsKitDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create kit item",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInventory(false);
    }
  };

  const handleAddExistingKit = async () => {
    if (!selectedProgramId || !newKitInventoryId || newKitQuantity < 1) {
      toast({
        title: "Error",
        description: "Please select an item and enter quantity",
        variant: "destructive",
      });
      return;
    }

    // Check if already added
    const existingKits = kitData[selectedProgramId] || [];
    if (existingKits.some((kit) => kit.inventoryId === Number(newKitInventoryId))) {
      toast({
        title: "Error",
        description: "This item is already in the kit",
        variant: "destructive",
      });
      return;
    }

    // Find the inventory details from program kits
    const programKit = programKits[selectedProgramId]?.find(
      (pk) => pk.inventoryId === Number(newKitInventoryId)
    );

    if (!programKit) {
      toast({
        title: "Error",
        description: "Item not found in program kit",
        variant: "destructive",
      });
      return;
    }

    // Add to kit data
    setKitData((prev) => ({
      ...prev,
      [selectedProgramId]: [
        ...(prev[selectedProgramId] || []),
        {
          id: 0,
          franchiseId: franchise.id,
          programId: selectedProgramId,
          inventoryId: Number(newKitInventoryId),
          quantity: newKitQuantity,
          inventory: programKit.inventory,
        } as FranchiseProgramKit,
      ],
    }));

    setNewKitInventoryId("");
    setNewKitQuantity(1);
    setIsKitDialogOpen(false);
  };

  useEffect(() => {
    if (isExpanded && franchisePrograms.length > 1) {
      const timer = setTimeout(() => {
        if (containerRef.current && startingKitInternalDotRef.current) {
          const containerTop =
            containerRef.current.getBoundingClientRect().top;
          const dotCenter =
            startingKitInternalDotRef.current.getBoundingClientRect().top +
            startingKitInternalDotRef.current.offsetHeight / 2;
          setLineHeight(dotCenter - containerTop);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, franchisePrograms, isEditing]);

  if (franchisePrograms.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative">
        <div ref={startingKitDotRef} className="absolute -left-6 top-1 w-6 h-4">
          <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
          <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
        </div>

        <div
          className="bg-white rounded-lg border border-primary p-4"
          ref={containerRef}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(sectionId)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <Package className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-lg text-gray-900">
                Starting Kit Items
              </h4>
            </div>
            {isExpanded && (
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isLoading}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {isLoading ? "Saving..." : "Save"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="space-y-4 mt-4">
              {isLoading && !isEditing ? (
                <div className="text-center py-4 text-gray-500">
                  Loading kit items...
                </div>
              ) : (
                franchisePrograms.map((fp) => {
                  const kits = kitData[fp.program.id] || [];
                  const defaultKits = programKits[fp.program.id] || [];

                  return (
                    <div
                      key={fp.program.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-base text-gray-900">
                          {fp.program.name}
                        </h5>
                        {isEditing && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddKitItem(fp.program.id)}
                            className="h-8"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Item
                          </Button>
                        )}
                      </div>

                      {kits.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No kit items assigned
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {kits.map((kit) => (
                            <div
                              key={`${kit.programId}-${kit.inventoryId}`}
                              className="flex items-center justify-between p-3 bg-white rounded border border-gray-200"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm text-gray-900">
                                  {kit.inventory?.name ||
                                    `Item #${kit.inventoryId}`}
                                </p>
                                {kit.inventory?.description && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {kit.inventory.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                  {kit.inventory?.category?.name && (
                                    <Badge variant="outline" className="text-xs">
                                      {kit.inventory.category.name}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-gray-600">
                                    Qty: {kit.quantity}
                                  </span>
                                </div>
                              </div>
                              {isEditing && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveKitItem(
                                      kit.programId,
                                      kit.inventoryId
                                    )
                                  }
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Kit Item Dialog */}
      <Dialog open={isKitDialogOpen} onOpenChange={setIsKitDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Add Kit Item
              {selectedProgramId &&
                ` - ${
                  franchisePrograms.find((fp) => fp.program.id === selectedProgramId)
                    ?.program.name
                }`}
            </DialogTitle>
            <DialogDescription>
              Create a new inventory item or select from existing program kit
              items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create New Item Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Create New Item</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inventoryName">
                      Item Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="inventoryName"
                      placeholder="e.g., Starter Kit Box"
                      value={newInventoryName}
                      onChange={(e) => setNewInventoryName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventoryCategory">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <CategorySelect
                      value={newInventoryCategory}
                      onValueChange={setNewInventoryCategory}
                      categories={inventoryCategories}
                      onCategoryAdded={handleCategoryAdded}
                      placeholder="Select category"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inventoryDescription">Description</Label>
                  <Input
                    id="inventoryDescription"
                    placeholder="Brief description"
                    value={newInventoryDescription}
                    onChange={(e) => setNewInventoryDescription(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inventoryQuantity">Stock Quantity</Label>
                    <Input
                      id="inventoryQuantity"
                      type="number"
                      min="0"
                      value={newInventoryQuantity}
                      onChange={(e) =>
                        setNewInventoryQuantity(Number(e.target.value) || 0)
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventoryRestockQuantity">
                      Restock Quantity
                    </Label>
                    <Input
                      id="inventoryRestockQuantity"
                      type="number"
                      min="0"
                      value={newInventoryRestockQuantity}
                      onChange={(e) =>
                        setNewInventoryRestockQuantity(
                          Number(e.target.value) || 0
                        )
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kitQuantity">
                      Kit Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="kitQuantity"
                      type="number"
                      min="1"
                      value={newKitQuantity}
                      onChange={(e) =>
                        setNewKitQuantity(Number(e.target.value) || 1)
                      }
                      className="h-10"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateAndAddKitItem}
                  disabled={
                    isCreatingInventory ||
                    !newInventoryName.trim() ||
                    !newInventoryCategory ||
                    newKitQuantity < 1
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreatingInventory ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create & Add
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Select Existing Item Section */}
            {selectedProgramId && programKits[selectedProgramId]?.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">
                  Select from Program Kit Items
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="existingKitSelect">
                        Program Kit Item
                      </Label>
                      <select
                        id="existingKitSelect"
                        value={newKitInventoryId}
                        onChange={(e) =>
                          setNewKitInventoryId(
                            e.target.value ? Number(e.target.value) : ""
                          )
                        }
                        className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select an item</option>
                        {programKits[selectedProgramId]
                          ?.filter(
                            (pk) =>
                              !kitData[selectedProgramId]?.some(
                                (kit) => kit.inventoryId === pk.inventoryId
                              )
                          )
                          .map((pk) => (
                            <option key={pk.id} value={pk.inventoryId}>
                              {pk.inventory?.name || `Item #${pk.inventoryId}`} (
                              Default Qty: {pk.defaultQuantity})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="existingKitQuantity">Quantity</Label>
                      <Input
                        id="existingKitQuantity"
                        type="number"
                        min="1"
                        value={newKitQuantity}
                        onChange={(e) =>
                          setNewKitQuantity(Number(e.target.value) || 1)
                        }
                        className="h-10"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddExistingKit}
                    disabled={!newKitInventoryId || newKitQuantity < 1}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Selected Item
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsKitDialogOpen(false);
                setNewInventoryName("");
                setNewInventoryDescription("");
                setNewInventoryCategory("");
                setNewInventoryQuantity(0);
                setNewInventoryRestockQuantity(0);
                setNewKitQuantity(1);
                setNewKitInventoryId("");
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

