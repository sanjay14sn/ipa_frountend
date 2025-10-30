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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Clock,
  CheckCircle,
  Truck,
  Package,
  ShoppingCart,
  Loader2,
  ChevronDown,
  X,
  IndianRupee,
  FileText,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { useUser } from "@/context/user-context";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  createOrder,
  getFranchiseeOrders,
  getOrderById,
  getInvoiceDetails,
  OrderData,
  OrderStatus,
  CreateOrderDto,
  InvoiceItem,
  initiateOrderPayment,
  verifyOrderPayment,
  OrderPaymentResponse,
} from "@/services/order.service";
import { useStudents } from "@/hooks/use-students";
import OrdersTable from "./components/OrdersTable";
import RazorpayPayment, {
  RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";

export default function FranchiseeOrdersPage() {
  const { user } = useUser();
  const { students, isLoading: studentsLoading } = useStudents();

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [paymentData, setPaymentData] = useState<OrderPaymentResponse | null>(
    null
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (user?.franchiseId) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    if (selectedStudents.length > 0) {
      fetchInvoice();
    } else {
      setInvoiceItems([]);
    }
  }, [selectedStudents]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const ordersData = await getFranchiseeOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoice = async () => {
    setLoadingInvoice(true);
    try {
      const invoice = await getInvoiceDetails(selectedStudents);
      setInvoiceItems(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error("Failed to load invoice details");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleCreateOrder = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    if (invoiceItems.length === 0) {
      toast.error("No items in invoice. Please check student selections.");
      return;
    }

    setSubmitting(true);
    setIsProcessingPayment(true);
    try {
      const paymentResponse = await initiateOrderPayment({
        studentIds: selectedStudents,
        notes: notes.trim() || undefined,
      });

      setPaymentData(paymentResponse);
      setIsOrderModalOpen(false); // Close modal before opening Razorpay
      toast.info("Redirecting to payment gateway...");
    } catch (error: any) {
      console.error("Error initiating payment:", error);
      toast.error(
        error.response?.data?.message || "Failed to initiate payment"
      );
      setSubmitting(false);
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (response: RazorpaySuccessResponse) => {
    try {
      const verifyResponse = await verifyOrderPayment({
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      });

      toast.success("Payment verified! Order placed successfully!");

      // Reset form
      setSelectedStudents([]);
      setNotes("");
      setInvoiceItems([]);
      setPaymentData(null);
      setIsOrderModalOpen(false);

      // Refresh orders
      await fetchOrders();
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      toast.error(
        error.response?.data?.message || "Payment verification failed"
      );
    } finally {
      setSubmitting(false);
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentFailure = async (error: any) => {
    console.error("Payment failed:", error);
    toast.error(error.error || "Payment failed. Please try again.");

    // Send cancellation to backend
    if (paymentData?.orderId) {
      try {
        await verifyOrderPayment({
          paymentId: "",
          orderId: paymentData.orderId,
          signature: "",
        });
      } catch (err) {
        console.error("Error updating payment status:", err);
      }
    }

    setSubmitting(false);
    setIsProcessingPayment(false);
    setPaymentData(null);
  };

  const handleViewOrderDetails = async (orderId: number) => {
    // Order details are shown in the expanded row
    console.log("View order details:", orderId);
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  if (loading || studentsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const activeStudents = students.filter((s) => s.isActive);

  const pendingOrders = orders.filter(
    (o) => o.status === OrderStatus.PENDING
  ).length;
  const processingOrders = orders.filter(
    (o) => o.status === OrderStatus.PROCESSING
  ).length;
  const shippedOrders = orders.filter(
    (o) => o.status === OrderStatus.SHIPPED
  ).length;
  const deliveredOrders = orders.filter(
    (o) => o.status === OrderStatus.DELIVERED
  ).length;

  // Get selected students data
  const selectedStudentsData = activeStudents.filter((s) =>
    selectedStudents.includes(s.id)
  );

  // Calculate invoice totals
  const invoiceSubtotal = invoiceItems.reduce(
    (sum, item) => sum + parseFloat(item.totalPrice),
    0
  );
  const invoiceTax = 0; // Add tax calculation if needed
  const invoiceTotal = invoiceSubtotal + invoiceTax;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Orders</h1>
          <p className="text-muted-foreground">
            Manage material orders for your franchise students
            {user?.profile && (
              <span className="block text-sm text-muted-foreground mt-1">
                Franchisee: {user.profile.name} • {user.profile.phone} •{" "}
                {user.profile.city}
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setIsOrderModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">All material orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shippedOrders}</div>
            <p className="text-xs text-muted-foreground">In transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredOrders}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <OrdersTable
        orders={orders}
        onViewOrderDetails={handleViewOrderDetails}
      />

      {/* New Order Modal */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Place Material Order
            </DialogTitle>
            <DialogDescription>
              Select students and review the invoice before placing your order
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Student Selection */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Select Students
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                      >
                        {selectedStudents.length === 0 ? (
                          "Select students..."
                        ) : (
                          <span className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {selectedStudents.length} selected
                            </Badge>
                            {selectedStudents.length <= 2 &&
                              selectedStudentsData
                                .map((s) => s.name)
                                .join(", ")}
                          </span>
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search students..." />
                        <CommandEmpty>No students found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {activeStudents.map((student) => (
                            <CommandItem
                              key={student.id}
                              onSelect={() =>
                                toggleStudentSelection(student.id)
                              }
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <Checkbox
                                  checked={selectedStudents.includes(
                                    student.id
                                  )}
                                  onCheckedChange={() =>
                                    toggleStudentSelection(student.id)
                                  }
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {student.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {student.rollNo} • {student.level}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {student.level}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedStudents.length > 0 && (
                    <div className="border rounded-lg p-2 max-h-40 overflow-y-auto bg-muted/30">
                      <div className="text-xs font-medium mb-1.5 px-1">
                        Selected Students ({selectedStudents.length})
                      </div>
                      <div className="space-y-1">
                        {selectedStudentsData.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-2 bg-background rounded text-xs hover:bg-accent"
                          >
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-muted-foreground">
                                {student.rollNo} • {student.level}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleStudentSelection(student.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Order Notes (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add special instructions or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: Invoice */}
            <div>
              <Card className="border-2">
                <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5" />
                        Invoice Preview
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Materials breakdown for selected students
                      </CardDescription>
                    </div>
                    {user?.profile && (
                      <Badge variant="outline" className="text-xs">
                        {user.profile.name}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {selectedStudents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Receipt className="h-16 w-16 mx-auto mb-3 opacity-10" />
                      <p className="text-sm font-medium">No items selected</p>
                      <p className="text-xs mt-1">
                        Select students to generate invoice
                      </p>
                    </div>
                  ) : loadingInvoice ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Generating invoice...
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Invoice Items */}
                      <div className="divide-y max-h-[300px] overflow-y-auto">
                        {invoiceItems.length > 0 ? (
                          invoiceItems.map((item) => (
                            <div
                              key={item.id}
                              className="px-4 py-3 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Quantity: {item.quantity}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 font-semibold text-sm whitespace-nowrap">
                                  <IndianRupee className="h-3.5 w-3.5" />
                                  {parseFloat(item.totalPrice).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No items found for selected students
                          </div>
                        )}
                      </div>

                      {/* Invoice Summary */}
                      {invoiceItems.length > 0 && (
                        <>
                          <Separator />
                          <div className="px-4 py-3 space-y-2 bg-muted/30">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Subtotal
                              </span>
                              <div className="flex items-center gap-1 font-medium">
                                <IndianRupee className="h-3.5 w-3.5" />
                                {invoiceSubtotal.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Tax</span>
                              <div className="flex items-center gap-1 font-medium">
                                <IndianRupee className="h-3.5 w-3.5" />
                                {invoiceTax.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <Separator />
                          <div className="px-4 py-4 bg-gradient-to-br from-primary/5 to-primary/10">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">
                                Total Amount
                              </span>
                              <div className="flex items-center gap-1 text-xl font-bold text-primary">
                                <IndianRupee className="h-5 w-5" />
                                {invoiceTotal.toFixed(2)}
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {invoiceItems.length} item
                              {invoiceItems.length > 1 ? "s" : ""} •{" "}
                              {selectedStudents.length} student
                              {selectedStudents.length > 1 ? "s" : ""}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedStudents.length > 0 && invoiceItems.length > 0 && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Invoice ready for {selectedStudents.length} student
                  {selectedStudents.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOrderModalOpen(false);
                  setSelectedStudents([]);
                  setNotes("");
                  setInvoiceItems([]);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={
                  selectedStudents.length === 0 ||
                  invoiceItems.length === 0 ||
                  submitting
                }
                size="lg"
                className="min-w-[160px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Razorpay Payment Component */}
      {paymentData && user?.profile && (
        <RazorpayPayment
          key={paymentData.orderId}
          orderId={paymentData.orderId}
          amount={paymentData.amount}
          currency={paymentData.currency}
          franchiseName={paymentData.franchiseName}
          razorpayKey={paymentData.key}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          userDetails={{
            name: user.profile.name,
            email: user.profile.mail,
            phone: user.profile.phone,
          }}
        />
      )}
    </div>
  );
}
