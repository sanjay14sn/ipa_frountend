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
} from "lucide-react";
import { getUserFromStorage } from "@/lib/auth";
import { ORDERS, STUDENTS } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

// Material pricing structure (would normally come from API)
const MATERIAL_RATES = {
  "1": {
    // franchise ID
    levelBooks: {
      Beginner: 250,
      Intermediate: 300,
      Advanced: 350,
    },
    tshirts: {
      XS: 180,
      S: 180,
      M: 200,
      L: 200,
      XL: 220,
      XXL: 240,
    },
    additionalItems: {
      Abacus: 150,
      "Practice Book": 80,
      "Flash Cards": 120,
      Calculator: 200,
      Workbook: 100,
      "Certificate Folder": 50,
    },
    royaltyRate: 0.12, // 12% royalty
  },
};

interface OrderItem {
  id: string;
  type: "levelBook" | "tshirt" | "additional";
  description: string;
  quantity: number;
  rate: number;
  total: number;
  metadata?: {
    level?: string;
    size?: string;
    students?: Array<{
      id: string;
      rollNo: string;
      name: string;
    }>;
  };
}

interface NewOrder {
  items: OrderItem[];
  subtotal: number;
  royalty: number;
  total: number;
}

export default function FranchiseeOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Order form state
  const [currentOrder, setCurrentOrder] = useState<NewOrder>({
    items: [],
    subtotal: 0,
    royalty: 0,
    total: 0,
  });

  // Form fields
  const [studentLevel, setStudentLevel] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [tshirtSize, setTshirtSize] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [additionalItem, setAdditionalItem] = useState("");
  const [additionalQuantity, setAdditionalQuantity] = useState(1);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
  }, []);

  const franchiseRates =
    MATERIAL_RATES[user?.franchiseId] || MATERIAL_RATES["1"];

  // Get students for current franchise
  const franchiseStudents = user?.franchiseId
    ? STUDENTS.filter((student) => student.franchiseId === user.franchiseId)
    : [];

  const calculateOrderTotal = () => {
    const subtotal = currentOrder.items.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const royalty = subtotal * franchiseRates.royaltyRate;
    const total = subtotal + royalty;

    setCurrentOrder((prev) => ({
      ...prev,
      subtotal,
      royalty,
      total,
    }));
  };

  useEffect(() => {
    calculateOrderTotal();
  }, [currentOrder.items]);

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  // Filter orders for current franchise
  const franchiseOrders = ORDERS.filter(
    (order) => order.franchiseId === user.franchiseId
  );

  const filteredOrders = franchiseOrders.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      return student ? `${student.name} (${student.id})` : "1 student selected";
    }
    return `${selectedStudents.length} students selected`;
  };

  const addLevelBookToOrder = () => {
    if (!studentLevel || selectedStudents.length === 0 || quantity <= 0) {
      alert("Please select student level, students, and quantity");
      return;
    }

    const rate = franchiseRates.levelBooks[studentLevel];
    const selectedStudentData = selectedStudents.map((studentId) => {
      const student = franchiseStudents.find((s) => s.id === studentId);
      return {
        id: studentId,
        rollNo: studentId, // Using ID as roll number for now
        name: student?.name || "Unknown Student",
      };
    });

    const newItem: OrderItem = {
      id: `book-${Date.now()}`,
      type: "levelBook",
      description: `${studentLevel} Level Book (${selectedStudents.length} students)`,
      quantity: quantity * selectedStudents.length, // Multiply by number of students
      rate,
      total: rate * quantity * selectedStudents.length,
      metadata: {
        level: studentLevel,
        students: selectedStudentData,
      },
    };

    setCurrentOrder((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    // Reset form
    setStudentLevel("");
    setQuantity(1);
    setSelectedStudents([]);
  };

  const addTshirtToOrder = () => {
    if (!tshirtSize || quantity <= 0) {
      alert("Please select T-shirt size and quantity");
      return;
    }

    const rate = franchiseRates.tshirts[tshirtSize];
    const newItem: OrderItem = {
      id: `tshirt-${Date.now()}`,
      type: "tshirt",
      description: `T-Shirt (${tshirtSize})`,
      quantity,
      rate,
      total: rate * quantity,
      metadata: {
        size: tshirtSize,
      },
    };

    setCurrentOrder((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    // Reset form
    setTshirtSize("");
    setQuantity(1);
  };

  const addAdditionalItemToOrder = () => {
    if (!additionalItem || additionalQuantity <= 0) {
      alert("Please select additional item and quantity");
      return;
    }

    const rate = franchiseRates.additionalItems[additionalItem];
    const newItem: OrderItem = {
      id: `additional-${Date.now()}`,
      type: "additional",
      description: additionalItem,
      quantity: additionalQuantity,
      rate,
      total: rate * additionalQuantity,
    };

    setCurrentOrder((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    // Reset form
    setAdditionalItem("");
    setAdditionalQuantity(1);
  };

  const removeItemFromOrder = (itemId: string) => {
    setCurrentOrder((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return; // Prevent quantity less than 1

    setCurrentOrder((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: item.rate * newQuantity }
          : item
      ),
    }));
  };

  const submitOrder = async () => {
    if (currentOrder.items.length === 0) {
      alert("Please add at least one item to the order");
      return;
    }

    // Here you would submit to API
    console.log("Submitting order:", currentOrder);

    // Reset and close modal
    setCurrentOrder({
      items: [],
      subtotal: 0,
      royalty: 0,
      total: 0,
    });
    setIsOrderModalOpen(false);

    alert("Order submitted successfully!");
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

  const pendingOrders = franchiseOrders.filter(
    (order) => order.status === "Pending"
  ).length;
  const processingOrders = franchiseOrders.filter(
    (order) => order.status === "Processing"
  ).length;
  const shippedOrders = franchiseOrders.filter(
    (order) => order.status === "Shipped"
  ).length;
  const deliveredOrders = franchiseOrders.filter(
    (order) => order.status === "Delivered"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground">
            Manage your franchise orders - {user.franchiseName}
          </p>
        </div>

        <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Material Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Material Order</DialogTitle>
              <DialogDescription>
                Submit your material requirements. Fill in the details below to
                add items to your order.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Form Sections */}
              <div className="lg:col-span-2 space-y-6">
                {/* Level Books Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Level Books</CardTitle>
                    <CardDescription>
                      Select student level, choose students, and specify
                      quantity per student
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="student-level">Student Level *</Label>
                        <Select
                          value={studentLevel}
                          onValueChange={setStudentLevel}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Beginner">
                              Beginner (₹{franchiseRates.levelBooks.Beginner})
                            </SelectItem>
                            <SelectItem value="Intermediate">
                              Intermediate (₹
                              {franchiseRates.levelBooks.Intermediate})
                            </SelectItem>
                            <SelectItem value="Advanced">
                              Advanced (₹{franchiseRates.levelBooks.Advanced})
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="quantity">Books per Student *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(parseInt(e.target.value) || 1)
                          }
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Total books: {quantity} × {selectedStudents.length}{" "}
                          students = {quantity * selectedStudents.length}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="roll-no">Select Students *</Label>
                        <Popover
                          open={isStudentDropdownOpen}
                          onOpenChange={setIsStudentDropdownOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isStudentDropdownOpen}
                              className="w-full justify-between"
                            >
                              {getSelectedStudentsText()}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search students..." />
                              <CommandEmpty>No students found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {franchiseStudents.map((student) => (
                                  <CommandItem
                                    key={student.id}
                                    onSelect={() =>
                                      toggleStudentSelection(student.id)
                                    }
                                    className="flex items-center space-x-2"
                                  >
                                    <Checkbox
                                      checked={selectedStudents.includes(
                                        student.id
                                      )}
                                      onChange={() =>
                                        toggleStudentSelection(student.id)
                                      }
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {student.name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        ID: {student.id} • Age: {student.age} •
                                        Level: {student.level}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="selected-count">
                          Selected Students
                        </Label>
                        <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                          <span className="text-sm">
                            {selectedStudents.length} student
                            {selectedStudents.length !== 1 ? "s" : ""} selected
                          </span>
                        </div>
                        {selectedStudents.length > 0 && (
                          <div className="mt-2 max-h-24 overflow-y-auto">
                            <div className="text-xs text-gray-600 space-y-1">
                              {selectedStudents.map((studentId) => {
                                const student = franchiseStudents.find(
                                  (s) => s.id === studentId
                                );
                                return student ? (
                                  <div
                                    key={studentId}
                                    className="flex justify-between"
                                  >
                                    <span>{student.name}</span>
                                    <span>ID: {student.id}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button onClick={addLevelBookToOrder} className="w-full">
                      Add Level Books to Order
                      {selectedStudents.length > 0 && (
                        <span className="ml-2 text-xs">
                          ({quantity * selectedStudents.length} books for{" "}
                          {selectedStudents.length} student
                          {selectedStudents.length !== 1 ? "s" : ""})
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* T-Shirts Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">T-Shirts</CardTitle>
                    <CardDescription>
                      Select T-shirt size and quantity
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="tshirt-size">T-Shirt Size</Label>
                        <Select
                          value={tshirtSize}
                          onValueChange={setTshirtSize}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(franchiseRates.tshirts).map(
                              ([size, price]) => (
                                <SelectItem key={size} value={size}>
                                  {size} (₹{price})
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="tshirt-quantity">Quantity</Label>
                        <Input
                          id="tshirt-quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                    </div>
                    <Button
                      onClick={addTshirtToOrder}
                      className="w-full"
                      variant="outline"
                    >
                      Add T-Shirt to Order
                    </Button>
                  </CardContent>
                </Card>

                {/* Additional Materials Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Additional Material Details
                    </CardTitle>
                    <CardDescription>
                      Add any additional materials you require
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="additional-item">Additional Item</Label>
                        <Select
                          value={additionalItem}
                          onValueChange={setAdditionalItem}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(franchiseRates.additionalItems).map(
                              ([item, price]) => (
                                <SelectItem key={item} value={item}>
                                  {item} (₹{price})
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="additional-quantity">Quantity</Label>
                        <Input
                          id="additional-quantity"
                          type="number"
                          min="1"
                          value={additionalQuantity}
                          onChange={(e) =>
                            setAdditionalQuantity(parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                    </div>
                    <Button
                      onClick={addAdditionalItemToOrder}
                      className="w-full"
                      variant="outline"
                    >
                      Add Additional Item to Order
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Order Summary Cart */}
              <div className="lg:col-span-1">
                <div className="sticky top-0">
                  <Card className="border-2 border-gray-200">
                    <CardHeader className="bg-gray-100">
                      <CardTitle className="text-lg flex items-center">
                        <ShoppingCart className="mr-2 h-5 w-5 text-gray-800" />
                        Order Cart
                        {currentOrder.items.length > 0 && (
                          <span className="ml-2 px-2 py-1 bg-black text-white text-xs rounded-full">
                            {currentOrder.items.length}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Cart Items */}
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {currentOrder.items.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                              <p className="text-sm">Your cart is empty</p>
                              <p className="text-xs">
                                Add items to see them here
                              </p>
                            </div>
                          ) : (
                            currentOrder.items.map((item) => (
                              <div
                                key={item.id}
                                className="border rounded-lg p-3 bg-gray-50"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">
                                      {item.description}
                                    </h4>
                                    {item.metadata?.students &&
                                      item.metadata.students.length > 0 && (
                                        <div className="text-xs text-gray-600 mt-1">
                                          <div className="font-medium">
                                            Students:
                                          </div>
                                          {item.metadata.students
                                            .slice(0, 2)
                                            .map((student) => (
                                              <div key={student.id}>
                                                {student.name}
                                              </div>
                                            ))}
                                          {item.metadata.students.length >
                                            2 && (
                                            <div className="text-xs">
                                              +
                                              {item.metadata.students.length -
                                                2}{" "}
                                              more
                                            </div>
                                          )}
                                          <div className="text-xs text-black mt-1">
                                            Total: {item.quantity} ÷{" "}
                                            {item.metadata.students.length} ={" "}
                                            {Math.round(
                                              item.quantity /
                                                item.metadata.students.length
                                            )}
                                            per student
                                          </div>
                                        </div>
                                      )}
                                    {item.metadata?.size && (
                                      <div className="text-xs text-gray-600">
                                        Size: {item.metadata.size}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItemFromOrder(item.id)}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">
                                      Qty:
                                    </span>
                                    <div className="flex items-center border rounded">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          updateItemQuantity(
                                            item.id,
                                            item.quantity - 1
                                          )
                                        }
                                        disabled={item.quantity <= 1}
                                        className="h-6 w-6 p-0 hover:bg-gray-100"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const value =
                                            parseInt(e.target.value) || 1;
                                          updateItemQuantity(item.id, value);
                                        }}
                                        className="h-6 w-12 text-center border-0 text-xs p-0"
                                        min="1"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          updateItemQuantity(
                                            item.id,
                                            item.quantity + 1
                                          )
                                        }
                                        className="h-6 w-6 p-0 hover:bg-gray-100"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium">
                                      ₹{item.total}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      @ ₹{item.rate} each
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Order Total - Always Visible */}
                        <div className="border-t pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>₹{currentOrder.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>
                              Royalty (
                              {(franchiseRates.royaltyRate * 100).toFixed(0)}%):
                            </span>
                            <span>₹{currentOrder.royalty.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total:</span>
                            <span>₹{currentOrder.total.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                          onClick={submitOrder}
                          className="w-full mt-4"
                          size="lg"
                          disabled={currentOrder.items.length === 0}
                        >
                          {currentOrder.items.length === 0
                            ? "Add items to continue"
                            : `Submit Order - ₹${currentOrder.total.toFixed(
                                2
                              )}`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{franchiseOrders.length}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processingOrders + shippedOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Processing + Shipped
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredOrders}</div>
            <p className="text-xs text-muted-foreground">Completed orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Types Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Orders by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {["Materials", "Contest Certificates", "Grading Certificates"].map(
              (type) => {
                const count = franchiseOrders.filter(
                  (order) => order.type === type
                ).length;
                const totalAmount = franchiseOrders
                  .filter((order) => order.type === type)
                  .reduce((sum, order) => {
                    const amount = parseInt(order.amount.replace(/[^\d]/g, ""));
                    return sum + amount;
                  }, 0);

                return (
                  <div
                    key={type}
                    className="text-center p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground">{type}</div>
                    <div className="text-xs text-muted-foreground">
                      ₹{totalAmount.toLocaleString()}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Orders List</CardTitle>
              <CardDescription>Your franchise orders</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                <TableHead>Actions</TableHead>
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
                    {new Date(order.expectedDelivery).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
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
