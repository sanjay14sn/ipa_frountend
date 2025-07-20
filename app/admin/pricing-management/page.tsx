"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  IndianRupee,
  Settings,
  Edit,
  Save,
  X,
  Calculator,
  Building2,
  Package,
  Percent,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import {
  FranchisePricingConfig,
  getDefaultPricingConfig,
  calculateOrderTotal,
  StudentLevel,
} from "@/lib/pricing";
import { getUserFromStorage } from "@/lib/auth";
import { toast } from "sonner";

export default function PricingManagementPage() {
  const [user, setUser] = useState<any>(null);
  const [franchises, setFranchises] = useState<any[]>([]);
  const [pricingConfigs, setPricingConfigs] = useState<
    FranchisePricingConfig[]
  >([]);
  const [selectedConfig, setSelectedConfig] =
    useState<FranchisePricingConfig | null>(null);
  const [editingConfig, setEditingConfig] =
    useState<FranchisePricingConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Preview calculation state
  const [previewLevel, setPreviewLevel] = useState<StudentLevel>("Level1");
  const [previewQuantity, setPreviewQuantity] = useState(1);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
    if (userData?.role === "admin") {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      const [franchisesRes, pricingRes] = await Promise.all([
        fetch("/api/franchises"),
        fetch("/api/franchise-pricing"),
      ]);

      const [franchisesData, pricingData] = await Promise.all([
        franchisesRes.json(),
        pricingRes.json(),
      ]);

      setFranchises(franchisesData.franchises || []);
      setPricingConfigs(pricingData.configs || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load pricing data");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (franchise: any) => {
    let config = pricingConfigs.find((c) => c.franchiseId === franchise.id);
    if (!config) {
      config = getDefaultPricingConfig(franchise.id, franchise.name);
    }
    setEditingConfig({ ...config });
    setIsEditModalOpen(true);
  };

  const saveConfig = async () => {
    if (!editingConfig) return;

    setSaving(true);
    try {
      const response = await fetch("/api/franchise-pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingConfig),
      });

      if (response.ok) {
        await fetchData();
        setIsEditModalOpen(false);
        setEditingConfig(null);
        toast.success("Pricing configuration saved successfully");
      } else {
        throw new Error("Failed to save configuration");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save pricing configuration");
    } finally {
      setSaving(false);
    }
  };

  const getFranchiseConfig = (franchiseId: string): FranchisePricingConfig => {
    return (
      pricingConfigs.find((c) => c.franchiseId === franchiseId) ||
      getDefaultPricingConfig(franchiseId, "Unknown")
    );
  };

  const previewCalculation = (config: FranchisePricingConfig) => {
    if (!config) return null;
    return calculateOrderTotal(
      config,
      previewLevel,
      previewQuantity,
      true,
      true
    );
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only administrators can access pricing management.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Pricing Management
        </h1>
        <p className="text-muted-foreground">
          Manage franchise-specific pricing, royalty rates, and discounts
        </p>
      </div>

      {/* Franchises Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Franchise Pricing Configuration
          </CardTitle>
          <CardDescription>
            Configure pricing and discount settings for each franchise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Franchise</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Royalty Rate</TableHead>
                <TableHead>Kit Cost</TableHead>
                <TableHead>Material Cost</TableHead>
                <TableHead>GST Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {franchises.map((franchise) => {
                const config = getFranchiseConfig(franchise.id);
                return (
                  <TableRow key={franchise.id}>
                    <TableCell className="font-medium">
                      {franchise.name}
                    </TableCell>
                    <TableCell>{franchise.location}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>₹{config.royalty.baseRoyaltyPerMonth}/month</span>
                        {config.royalty.discountPercentage > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            -{config.royalty.discountPercentage}% discount
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>₹{config.materialCosts.kitCost.baseCost}</span>
                        {config.materialCosts.kitCost.discountPercentage >
                          0 && (
                          <Badge variant="secondary" className="text-xs">
                            -{config.materialCosts.kitCost.discountPercentage}%
                            discount
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>
                          ₹
                          {config.materialCosts.level2PlusMaterialCost.baseCost}
                        </span>
                        {config.materialCosts.level2PlusMaterialCost
                          .discountPercentage > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            -
                            {
                              config.materialCosts.level2PlusMaterialCost
                                .discountPercentage
                            }
                            % discount
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{config.gst.rate}%</TableCell>
                    <TableCell>
                      <Badge
                        variant={config.isActive ? "default" : "secondary"}
                        className={
                          config.isActive ? "bg-green-100 text-green-800" : ""
                        }
                      >
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(franchise)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Configuration Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configure Pricing - {editingConfig?.franchiseName}
            </DialogTitle>
            <DialogDescription>
              Set franchise-specific pricing, royalty rates, and discount
              options
            </DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-6">
              <Tabs defaultValue="royalty" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="royalty">Royalty</TabsTrigger>
                  <TabsTrigger value="materials">Materials</TabsTrigger>
                  <TabsTrigger value="extra">Extra Items</TabsTrigger>
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                </TabsList>

                <TabsContent value="royalty" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IndianRupee className="h-5 w-5" />
                        Royalty Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure royalty amounts and durations for different
                        levels
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Base Royalty (Per Month) *</Label>
                          <Input
                            type="number"
                            value={editingConfig.royalty.baseRoyaltyPerMonth}
                            onChange={(e) =>
                              setEditingConfig((prev) => ({
                                ...prev!,
                                royalty: {
                                  ...prev!.royalty,
                                  baseRoyaltyPerMonth:
                                    parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                            placeholder="e.g., 250"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Royalty Discount (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={editingConfig.royalty.discountPercentage}
                            onChange={(e) =>
                              setEditingConfig((prev) => ({
                                ...prev!,
                                royalty: {
                                  ...prev!.royalty,
                                  discountPercentage:
                                    parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Level 1 Duration (Months)</Label>
                          <Input
                            type="number"
                            value={editingConfig.royalty.level1Months}
                            onChange={(e) =>
                              setEditingConfig((prev) => ({
                                ...prev!,
                                royalty: {
                                  ...prev!.royalty,
                                  level1Months: parseInt(e.target.value) || 4,
                                },
                              }))
                            }
                            placeholder="4"
                          />
                          <p className="text-xs text-muted-foreground">
                            Standard: 4 months for Level 1
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Level 2+ Duration (Months)</Label>
                          <Input
                            type="number"
                            value={editingConfig.royalty.level2PlusMonths}
                            onChange={(e) =>
                              setEditingConfig((prev) => ({
                                ...prev!,
                                royalty: {
                                  ...prev!.royalty,
                                  level2PlusMonths:
                                    parseInt(e.target.value) || 3,
                                },
                              }))
                            }
                            placeholder="3"
                          />
                          <p className="text-xs text-muted-foreground">
                            Standard: 3 months for Level 2 to Grand Level 3
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Material Cost Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Kit Cost */}
                      <div className="space-y-4">
                        <h3 className="font-semibold">Kit Cost (Level 1)</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Base Kit Cost *</Label>
                            <Input
                              type="number"
                              value={
                                editingConfig.materialCosts.kitCost.baseCost
                              }
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev!,
                                  materialCosts: {
                                    ...prev!.materialCosts,
                                    kitCost: {
                                      ...prev!.materialCosts.kitCost,
                                      baseCost: parseFloat(e.target.value) || 0,
                                    },
                                  },
                                }))
                              }
                              placeholder="e.g., 1500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Kit Discount (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={
                                editingConfig.materialCosts.kitCost
                                  .discountPercentage
                              }
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev!,
                                  materialCosts: {
                                    ...prev!.materialCosts,
                                    kitCost: {
                                      ...prev!.materialCosts.kitCost,
                                      discountPercentage:
                                        parseFloat(e.target.value) || 0,
                                    },
                                  },
                                }))
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Material Cost Level 2+ */}
                      <div className="space-y-4">
                        <h3 className="font-semibold">
                          Material Cost (Level 2+)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Base Material Cost *</Label>
                            <Input
                              type="number"
                              value={
                                editingConfig.materialCosts
                                  .level2PlusMaterialCost.baseCost
                              }
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev!,
                                  materialCosts: {
                                    ...prev!.materialCosts,
                                    level2PlusMaterialCost: {
                                      ...prev!.materialCosts
                                        .level2PlusMaterialCost,
                                      baseCost: parseFloat(e.target.value) || 0,
                                    },
                                  },
                                }))
                              }
                              placeholder="e.g., 300"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Material Discount (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={
                                editingConfig.materialCosts
                                  .level2PlusMaterialCost.discountPercentage
                              }
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev!,
                                  materialCosts: {
                                    ...prev!.materialCosts,
                                    level2PlusMaterialCost: {
                                      ...prev!.materialCosts
                                        .level2PlusMaterialCost,
                                      discountPercentage:
                                        parseFloat(e.target.value) || 0,
                                    },
                                  },
                                }))
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* GST Settings */}
                      <div className="space-y-4">
                        <h3 className="font-semibold">GST Configuration</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>GST Rate (%)</Label>
                            <Input
                              type="number"
                              value={editingConfig.gst.rate}
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev!,
                                  gst: {
                                    ...prev!.gst,
                                    rate: parseFloat(e.target.value) || 18,
                                  },
                                }))
                              }
                              placeholder="18"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Include GST in Royalty</Label>
                            <div className="flex items-center space-x-2 mt-2">
                              <Checkbox
                                id="gst-royalty"
                                checked={editingConfig.gst.includeInRoyalty}
                                onCheckedChange={(checked) =>
                                  setEditingConfig((prev) => ({
                                    ...prev!,
                                    gst: {
                                      ...prev!.gst,
                                      includeInRoyalty: !!checked,
                                    },
                                  }))
                                }
                              />
                              <Label htmlFor="gst-royalty">Yes</Label>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Include GST in Material</Label>
                            <div className="flex items-center space-x-2 mt-2">
                              <Checkbox
                                id="gst-material"
                                checked={
                                  editingConfig.gst.includeInMaterialCost
                                }
                                onCheckedChange={(checked) =>
                                  setEditingConfig((prev) => ({
                                    ...prev!,
                                    gst: {
                                      ...prev!.gst,
                                      includeInMaterialCost: !!checked,
                                    },
                                  }))
                                }
                              />
                              <Label htmlFor="gst-material">Yes</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="extra" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Extra Materials</CardTitle>
                      <CardDescription>
                        Configure pricing for additional materials and items
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(
                          editingConfig.materialCosts.extraMaterials
                        ).map(([item, config]) => (
                          <div
                            key={item}
                            className="grid grid-cols-3 gap-4 items-center"
                          >
                            <Label className="font-medium">{item}</Label>
                            <Input
                              type="number"
                              value={config.baseCost}
                              onChange={(e) => {
                                const newValue =
                                  parseFloat(e.target.value) || 0;
                                setEditingConfig((prev) => ({
                                  ...prev!,
                                  materialCosts: {
                                    ...prev!.materialCosts,
                                    extraMaterials: {
                                      ...prev!.materialCosts.extraMaterials,
                                      [item]: {
                                        ...prev!.materialCosts.extraMaterials[
                                          item
                                        ],
                                        baseCost: newValue,
                                      },
                                    },
                                  },
                                }));
                              }}
                              placeholder="Base cost"
                            />
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={config.discountPercentage}
                              onChange={(e) => {
                                const newValue =
                                  parseFloat(e.target.value) || 0;
                                setEditingConfig((prev) => ({
                                  ...prev!,
                                  materialCosts: {
                                    ...prev!.materialCosts,
                                    extraMaterials: {
                                      ...prev!.materialCosts.extraMaterials,
                                      [item]: {
                                        ...prev!.materialCosts.extraMaterials[
                                          item
                                        ],
                                        discountPercentage: newValue,
                                      },
                                    },
                                  },
                                }));
                              }}
                              placeholder="Discount %"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Options
                      </CardTitle>
                      <CardDescription>
                        Configure available payment methods for this franchise
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(editingConfig.paymentOptions).map(
                          ([option, enabled]) => (
                            <div
                              key={option}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={option}
                                checked={enabled}
                                onCheckedChange={(checked) =>
                                  setEditingConfig((prev) => ({
                                    ...prev!,
                                    paymentOptions: {
                                      ...prev!.paymentOptions,
                                      [option]: !!checked,
                                    },
                                  }))
                                }
                              />
                              <Label htmlFor={option} className="capitalize">
                                {option === "gpay"
                                  ? "GPay"
                                  : option === "paytm"
                                  ? "Paytm"
                                  : option === "netBanking"
                                  ? "Net Banking"
                                  : option === "debitCard"
                                  ? "Debit Card"
                                  : option === "creditCard"
                                  ? "Credit Card"
                                  : option}
                              </Label>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Preview Calculation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Pricing Preview
                  </CardTitle>
                  <CardDescription>
                    Preview how the pricing will be calculated with current
                    settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Student Level</Label>
                      <Select
                        value={previewLevel}
                        onValueChange={(value: StudentLevel) =>
                          setPreviewLevel(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Level1">Level 1</SelectItem>
                          <SelectItem value="Level2">Level 2</SelectItem>
                          <SelectItem value="Level3">Level 3</SelectItem>
                          <SelectItem value="GrandLevel1">
                            Grand Level 1
                          </SelectItem>
                          <SelectItem value="GrandLevel2">
                            Grand Level 2
                          </SelectItem>
                          <SelectItem value="GrandLevel3">
                            Grand Level 3
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={previewQuantity}
                        onChange={(e) =>
                          setPreviewQuantity(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                  </div>

                  {(() => {
                    const calculation = previewCalculation(editingConfig);
                    if (!calculation) return null;

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {calculation.kitCost && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-blue-900">
                                Kit Cost
                              </h4>
                              <div className="mt-2 space-y-1">
                                <div className="text-sm">
                                  Base: ₹{calculation.kitCost.baseCost}
                                </div>
                                {calculation.kitCost.discountAmount > 0 && (
                                  <div className="text-sm text-green-600">
                                    Discount: -₹
                                    {calculation.kitCost.discountAmount}
                                  </div>
                                )}
                                <div className="text-sm">
                                  GST: ₹{calculation.kitCost.gstAmount}
                                </div>
                                <div className="font-bold text-blue-900">
                                  Final: ₹{calculation.kitCost.finalCost}
                                </div>
                              </div>
                            </div>
                          )}

                          {calculation.materialCost && (
                            <div className="bg-green-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-green-900">
                                Material Cost
                              </h4>
                              <div className="mt-2 space-y-1">
                                <div className="text-sm">
                                  Base: ₹{calculation.materialCost.baseCost}
                                </div>
                                {calculation.materialCost.discountAmount >
                                  0 && (
                                  <div className="text-sm text-green-600">
                                    Discount: -₹
                                    {calculation.materialCost.discountAmount}
                                  </div>
                                )}
                                <div className="text-sm">
                                  GST: ₹{calculation.materialCost.gstAmount}
                                </div>
                                <div className="font-bold text-green-900">
                                  Final: ₹{calculation.materialCost.finalCost}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-purple-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-purple-900">
                              Royalty
                            </h4>
                            <div className="mt-2 space-y-1">
                              <div className="text-sm">
                                ₹{calculation.royalty.basePerMonth} ×{" "}
                                {calculation.royalty.months} months ×{" "}
                                {previewQuantity}
                              </div>
                              <div className="text-sm">
                                Base: ₹{calculation.royalty.baseTotal}
                              </div>
                              {calculation.royalty.discountAmount > 0 && (
                                <div className="text-sm text-green-600">
                                  Discount: -₹
                                  {calculation.royalty.discountAmount}
                                </div>
                              )}
                              <div className="text-sm">
                                GST: ₹{calculation.royalty.gstAmount}
                              </div>
                              <div className="font-bold text-purple-900">
                                Final: ₹{calculation.royalty.finalRoyalty}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-900 text-white p-4 rounded-lg">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold">
                              Total Order Amount
                            </h4>
                            <div className="text-right">
                              <div className="text-2xl font-bold">
                                ₹{calculation.grandTotal}
                              </div>
                              <div className="text-sm opacity-75">
                                Includes ₹{calculation.totalGst} GST
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button onClick={saveConfig} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
