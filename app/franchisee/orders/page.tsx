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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  ShoppingCart,
  Clock,
  CheckCircle,
  Truck,
  Trash2,
  Calculator,
  Minus,
  CreditCard,
  IndianRupee,
  Package,
  AlertTriangle,
} from "lucide-react";
import { getUserFromStorage } from "@/lib/auth";
import { ORDERS, STUDENTS, Order } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FranchisePricingConfig,
  StudentLevel,
  calculateOrderTotal,
  OrderCalculation,
  getDefaultPricingConfig,
} from "@/lib/pricing";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  level: StudentLevel;
  quantity: number;
  calculation: OrderCalculation;
  students?: Array<{
    id: string;
    rollNo: string;
    name: string;
  }>;
  extraItems?: Array<{
    name: string;
    quantity: number;
    baseCost: number;
    discountAmount: number;
    gstAmount: number;
    finalCost: number;
  }>;
}

interface NewOrder {
  items: OrderItem[];
  subtotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
  paymentMethod?: string;
}

export default function FranchiseeOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [pricingConfig, setPricingConfig] =
    useState<FranchisePricingConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Order form state
  const [currentOrder, setCurrentOrder] = useState<NewOrder>({
    items: [],
    subtotal: 0,
    totalDiscount: 0,
    totalGst: 0,
    grandTotal: 0,
  });

  // Form fields
  const [selectedLevel, setSelectedLevel] = useState<StudentLevel>("Level1");
  const [quantity, setQuantity] = useState(1);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedExtraItems, setSelectedExtraItems] = useState<{
    [key: string]: number;
  }>({});

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculationLoading, setCalculationLoading] = useState(false);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
    if (userData?.franchiseId) {
      fetchData(userData);
    }
  }, []);

  const fetchData = async (userData: any) => {
    setLoading(true);
    try {
      const [ordersRes, pricingRes] = await Promise.all([
        fetch(`/api/orders?franchiseId=${userData.franchiseId}`),
        fetch(`/api/franchise-pricing?franchiseId=${userData.franchiseId}`),
      ]);

      const [ordersData, pricingData] = await Promise.all([
        ordersRes.json(),
        pricingRes.json(),
      ]);

      setOrders(ordersData.orders || []);
      setPricingConfig(
        pricingData.config ||
          getDefaultPricingConfig(userData.franchiseId, userData.franchiseName)
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Get students for current franchise
  const franchiseStudents = user?.franchiseId
    ? STUDENTS.filter((student) => student.franchiseId === user.franchiseId)
    : [];

  const calculateOrderTotals = () => {
    if (!currentOrder.items.length) {
      setCurrentOrder((prev) => ({
        ...prev,
        subtotal: 0,
        totalDiscount: 0,
        totalGst: 0,
        grandTotal: 0,
      }));
      return;
    }

    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let grandTotal = 0;

    currentOrder.items.forEach((item) => {
      subtotal += item.calculation.subtotal;
      totalDiscount += item.calculation.totalDiscount;
      totalGst += item.calculation.totalGst;
      grandTotal += item.calculation.grandTotal;

      // Add extra items
      if (item.extraItems) {
        item.extraItems.forEach((extra) => {
          subtotal += extra.baseCost - extra.discountAmount;
          totalDiscount += extra.discountAmount;
          totalGst += extra.gstAmount;
          grandTotal += extra.finalCost;
        });
      }
    });

    setCurrentOrder((prev) => ({
      ...prev,
      subtotal,
      totalDiscount,
      totalGst,
      grandTotal,
    }));
  };

  useEffect(() => {
    calculateOrderTotals();
  }, [currentOrder.items]);

  const addItemToOrder = async () => {
    if (!pricingConfig || !selectedLevel || quantity <= 0) {
      toast.error("Please select level and quantity");
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setCalculationLoading(true);
    try {
      // Calculate base pricing
      const calculation = calculateOrderTotal(
        pricingConfig,
        selectedLevel,
        quantity * selectedStudents.length,
        true,
        true
      );

      // Add extra items calculation
      const extraItems = Object.entries(selectedExtraItems)
        .filter(([_, qty]) => qty > 0)
        .map(([itemName, qty]) => {
          const itemConfig =
            pricingConfig.materialCosts.extraMaterials[itemName];
          const baseCost = itemConfig.baseCost * qty;
          const discountAmount =
            (baseCost * itemConfig.discountPercentage) / 100;
          const afterDiscount = baseCost - discountAmount;
          const gstAmount = pricingConfig.gst.includeInMaterialCost
            ? (afterDiscount * pricingConfig.gst.rate) / 100
            : 0;
          const finalCost = afterDiscount + gstAmount;

          return {
            name: itemName,
            quantity: qty,
            baseCost,
            discountAmount,
            gstAmount,
            finalCost,
          };
        });

      const selectedStudentData = selectedStudents.map((studentId) => {
        const student = franchiseStudents.find((s) => s.id === studentId);
        return {
          id: studentId,
          rollNo: studentId,
          name: student?.name || "Unknown Student",
        };
      });

      const newItem: OrderItem = {
        id: `item-${Date.now()}`,
        level: selectedLevel,
        quantity: quantity * selectedStudents.length,
        calculation,
        students: selectedStudentData,
        extraItems: extraItems.length > 0 ? extraItems : undefined,
      };

      setCurrentOrder((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));

      // Reset form
      setSelectedLevel("Level1");
      setQuantity(1);
      setSelectedStudents([]);
      setSelectedExtraItems({});
      toast.success("Item added to order");
    } catch (error) {
      console.error("Error calculating order:", error);
      toast.error("Failed to calculate order");
    } finally {
      setCalculationLoading(false);
    }
  };

  const removeItemFromOrder = (itemId: string) => {
    setCurrentOrder((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
    toast.success("Item removed from order");
  };

  const proceedToPayment = () => {
    if (currentOrder.items.length === 0) {
      toast.error("Please add at least one item to the order");
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const submitOrder = async () => {
    if (!user || !currentOrder.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      // Prepare order description
      const itemsDescription = currentOrder.items
        .map((item) => {
          let desc = `${item.level} (${item.students?.length || 0} students)`;
          if (item.extraItems) {
            const extraDesc = item.extraItems
              .map((extra) => `${extra.name} (${extra.quantity})`)
              .join(", ");
            desc += ` + ${extraDesc}`;
          }
          return desc;
        })
        .join("; ");

      const payload = {
        franchiseId: user.franchiseId,
        franchise: user.franchiseName,
        type: "Materials",
        items: itemsDescription,
        amount: `₹${currentOrder.grandTotal.toFixed(2)}`,
        status: "Pending",
        orderDate: new Date().toISOString().split("T")[0],
        expectedDelivery: "",
        paymentMethod: currentOrder.paymentMethod,
        orderDetails: {
          items: currentOrder.items,
          pricing: {
            subtotal: currentOrder.subtotal,
            totalDiscount: currentOrder.totalDiscount,
            totalGst: currentOrder.totalGst,
            grandTotal: currentOrder.grandTotal,
          },
        },
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData(user);
        setCurrentOrder({
          items: [],
          subtotal: 0,
          totalDiscount: 0,
          totalGst: 0,
          grandTotal: 0,
        });
        setIsOrderModalOpen(false);
        setIsPaymentModalOpen(false);
        toast.success("Order submitted successfully!");
      } else {
        throw new Error("Failed to submit order");
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Failed to submit order");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "Shipped":
        return "bg-blue-100 text-blue-800";
      case "Processing":
        return "bg-yellow-100 text-yellow-800";
      case "Pending":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const getSelectedStudentsText = () => {
    if (selectedStudents.length === 0) return "Select students";
    if (selectedStudents.length === 1) {
      const student = franchiseStudents.find(
        (s) => s.id === selectedStudents[0]
      );
      return student
        ? `${student.name} (${student.rollNo || student.id})`
        : "1 student selected";
    }
    return `${selectedStudents.length} students selected`;
  };

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading order data...</p>
        </div>
      </div>
    );
  }

  if (!pricingConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Pricing Not Configured</h2>
          <p className="text-muted-foreground">
            Please contact the administrator to configure pricing for your
            franchise.
          </p>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;
  const processingOrders = orders.filter(
    (order) => order.status === "Processing"
  ).length;
  const shippedOrders = orders.filter(
    (order) => order.status === "Shipped"
  ).length;
  const deliveredOrders = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track your material orders
          </p>
        </div>
        <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Add materials and calculate pricing for your franchise
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Pricing Configuration Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5" />
                    Pricing Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Label className="text-xs text-blue-600">
                        Base Royalty
                      </Label>
                      <div className="font-semibold">
                        ₹{pricingConfig.royalty.baseRoyaltyPerMonth}/month
                      </div>
                      {pricingConfig.royalty.discountPercentage > 0 && (
                        <div className="text-green-600 text-xs">
                          -{pricingConfig.royalty.discountPercentage}% discount
                        </div>
                      )}
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <Label className="text-xs text-green-600">Kit Cost</Label>
                      <div className="font-semibold">
                        ₹{pricingConfig.materialCosts.kitCost.baseCost}
                      </div>
                      {pricingConfig.materialCosts.kitCost.discountPercentage >
                        0 && (
                        <div className="text-green-600 text-xs">
                          -
                          {
                            pricingConfig.materialCosts.kitCost
                              .discountPercentage
                          }
                          % discount
                        </div>
                      )}
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <Label className="text-xs text-purple-600">
                        Material Cost
                      </Label>
                      <div className="font-semibold">
                        ₹
                        {
                          pricingConfig.materialCosts.level2PlusMaterialCost
                            .baseCost
                        }
                      </div>
                      {pricingConfig.materialCosts.level2PlusMaterialCost
                        .discountPercentage > 0 && (
                        <div className="text-green-600 text-xs">
                          -
                          {
                            pricingConfig.materialCosts.level2PlusMaterialCost
                              .discountPercentage
                          }
                          % discount
                        </div>
                      )}
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <Label className="text-xs text-orange-600">
                        GST Rate
                      </Label>
                      <div className="font-semibold">
                        {pricingConfig.gst.rate}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Level and Students Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Course Level & Students</CardTitle>
                  <CardDescription>
                    Select the course level and students for this order
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Student Level *</Label>
                      <Select
                        value={selectedLevel}
                        onValueChange={(value: StudentLevel) =>
                          setSelectedLevel(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Level1">
                            Level 1 (4 months royalty + Kit)
                          </SelectItem>
                          <SelectItem value="Level2">
                            Level 2 (3 months royalty + Material)
                          </SelectItem>
                          <SelectItem value="Level3">
                            Level 3 (3 months royalty + Material)
                          </SelectItem>
                          <SelectItem value="Level4">
                            Level 4 (3 months royalty + Material)
                          </SelectItem>
                          <SelectItem value="Level5">
                            Level 5 (3 months royalty + Material)
                          </SelectItem>
                          <SelectItem value="GrandLevel1">
                            Grand Level 1 (3 months royalty + Material)
                          </SelectItem>
                          <SelectItem value="GrandLevel2">
                            Grand Level 2 (3 months royalty + Material)
                          </SelectItem>
                          <SelectItem value="GrandLevel3">
                            Grand Level 3 (3 months royalty + Material)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity per Student</Label>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Selected Students</Label>
                      <div className="relative">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {}}
                        >
                          {getSelectedStudentsText()}
                        </Button>
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg">
                          {franchiseStudents.map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-50"
                            >
                              <Checkbox
                                id={student.id}
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={() =>
                                  toggleStudentSelection(student.id)
                                }
                              />
                              <Label
                                htmlFor={student.id}
                                className="flex-1 cursor-pointer"
                              >
                                {student.name} ({student.rollNo || student.id})
                                - {student.level}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Extra Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Items</CardTitle>
                  <CardDescription>
                    Select any additional materials needed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(
                      pricingConfig.materialCosts.extraMaterials
                    ).map(([itemName, itemConfig]) => (
                      <div key={itemName} className="space-y-2">
                        <Label className="text-sm font-medium">
                          {itemName}
                        </Label>
                        <div className="text-xs text-muted-foreground">
                          ₹{itemConfig.baseCost}
                          {itemConfig.discountPercentage > 0 && (
                            <span className="text-green-600">
                              {" "}
                              (-{itemConfig.discountPercentage}%)
                            </span>
                          )}
                        </div>
                        <Input
                          type="number"
                          min="0"
                          value={selectedExtraItems[itemName] || 0}
                          onChange={(e) =>
                            setSelectedExtraItems((prev) => ({
                              ...prev,
                              [itemName]: parseInt(e.target.value) || 0,
                            }))
                          }
                          placeholder="Qty"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Current Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Current Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentOrder.items.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No items added yet. Add items using the form above.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {currentOrder.items.map((item) => (
                          <div key={item.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold">
                                  {item.level} - {item.students?.length || 0}{" "}
                                  students
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity}
                                </p>
                                {item.students && (
                                  <p className="text-sm text-muted-foreground">
                                    Students:{" "}
                                    {item.students
                                      .map((s) => s.name)
                                      .join(", ")}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeItemFromOrder(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                              {item.calculation.kitCost && (
                                <div className="bg-blue-50 p-3 rounded">
                                  <div className="font-medium text-blue-900">
                                    Kit Cost
                                  </div>
                                  <div className="text-sm">
                                    ₹{item.calculation.kitCost.finalCost}
                                  </div>
                                </div>
                              )}
                              {item.calculation.materialCost && (
                                <div className="bg-green-50 p-3 rounded">
                                  <div className="font-medium text-green-900">
                                    Material Cost
                                  </div>
                                  <div className="text-sm">
                                    ₹{item.calculation.materialCost.finalCost}
                                  </div>
                                </div>
                              )}
                              <div className="bg-purple-50 p-3 rounded">
                                <div className="font-medium text-purple-900">
                                  Royalty
                                </div>
                                <div className="text-sm">
                                  ₹{item.calculation.royalty.finalRoyalty}
                                  <div className="text-xs">
                                    ({item.calculation.royalty.months} months)
                                  </div>
                                </div>
                              </div>
                            </div>

                            {item.extraItems && item.extraItems.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="font-medium text-sm mb-2">
                                  Additional Items:
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {item.extraItems.map((extra, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-gray-50 p-2 rounded text-xs"
                                    >
                                      <div className="font-medium">
                                        {extra.name}
                                      </div>
                                      <div>Qty: {extra.quantity}</div>
                                      <div>₹{extra.finalCost}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t bg-gray-50 p-3 rounded">
                              <div className="flex justify-between font-semibold">
                                <span>Item Total:</span>
                                <span>
                                  ₹
                                  {item.calculation.grandTotal +
                                    (item.extraItems?.reduce(
                                      (sum, extra) => sum + extra.finalCost,
                                      0
                                    ) || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentOrder.items.length > 0 && (
                      <div className="bg-gray-900 text-white p-4 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{currentOrder.subtotal.toFixed(2)}</span>
                          </div>
                          {currentOrder.totalDiscount > 0 && (
                            <div className="flex justify-between text-green-400">
                              <span>Total Discount:</span>
                              <span>
                                -₹{currentOrder.totalDiscount.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Total GST ({pricingConfig.gst.rate}%):</span>
                            <span>₹{currentOrder.totalGst.toFixed(2)}</span>
                          </div>
                          <Separator className="bg-gray-600" />
                          <div className="flex justify-between text-lg font-bold">
                            <span>Grand Total:</span>
                            <span>₹{currentOrder.grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={addItemToOrder}
                        disabled={
                          calculationLoading || selectedStudents.length === 0
                        }
                        className="flex-1"
                      >
                        {calculationLoading ? "Calculating..." : "Add to Order"}
                      </Button>
                      {currentOrder.items.length > 0 && (
                        <Button
                          onClick={proceedToPayment}
                          className="flex-1"
                          variant="default"
                        >
                          Proceed to Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Select Payment Method
            </DialogTitle>
            <DialogDescription>
              Choose how you want to pay for this order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span>₹{currentOrder.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="space-y-2">
                {Object.entries(pricingConfig.paymentOptions)
                  .filter(([_, enabled]) => enabled)
                  .map(([method]) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox
                        id={method}
                        checked={currentOrder.paymentMethod === method}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCurrentOrder((prev) => ({
                              ...prev,
                              paymentMethod: method,
                            }));
                          }
                        }}
                      />
                      <Label
                        htmlFor={method}
                        className="capitalize cursor-pointer"
                      >
                        {method === "gpay"
                          ? "GPay"
                          : method === "paytm"
                          ? "Paytm"
                          : method === "netBanking"
                          ? "Net Banking"
                          : method === "debitCard"
                          ? "Debit Card"
                          : method === "creditCard"
                          ? "Credit Card"
                          : method}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={submitOrder}
                disabled={!currentOrder.paymentMethod}
                className="flex-1"
              >
                Submit Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-red-100 rounded-lg mr-4">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{pendingOrders}</div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-yellow-100 rounded-lg mr-4">
              <Package className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{processingOrders}</div>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{shippedOrders}</div>
              <p className="text-sm text-muted-foreground">Shipped</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-green-100 rounded-lg mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{deliveredOrders}</div>
              <p className="text-sm text-muted-foreground">Delivered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>Track the status of your orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.type}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {order.items}
                  </TableCell>
                  <TableCell className="font-medium">{order.amount}</TableCell>
                  <TableCell>
                    <Badge
                      className={getStatusColor(order.status)}
                      variant="secondary"
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(order.orderDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {order.expectedDelivery
                      ? new Date(order.expectedDelivery).toLocaleDateString()
                      : "TBD"}
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm
                        ? "No orders found matching your search."
                        : "No orders yet."}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
