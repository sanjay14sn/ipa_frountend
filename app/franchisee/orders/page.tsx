"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  Plus,
  Receipt,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/context/user-context";
import { useStudents } from "@/hooks/api/student.hooks";
import { useFranchiseeOrders, invalidateAdminOrders } from "@/hooks/api/order.hooks";
import { useCourseInstructors } from "@/hooks/api/course-instructor.hooks";
import { TablePageShell, MultiSelectDropdown } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OrdersTable from "./components/OrdersTable";
import InvoicePreviewCard from "./components/InvoicePreviewCard";
import RazorpayPayment, {
  type RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";
import {
  abandonOrderPayment,
  createOrder,
  initiateOrderPayment,
  previewOrderInvoice,
  verifyOrderPayment,
  previewCIOrderInvoice,
  initiateCIOrderPayment,
  type InvoicePreview,
  type OrderPaymentResponse,
  OrderStatus,
} from "@/services/order.service";

export default function FranchiseeOrdersPage() {
  const { user } = useUser();
  const { students, isLoading: studentsLoading } = useStudents();
  const { courseInstructors, isLoading: ciLoading } = useCourseInstructors();
  const {
    orders,
    isLoading: ordersLoading,
    revalidate: refetchOrders,
  } = useFranchiseeOrders(undefined, Boolean(user?.franchiseId));

  // --- Student order state ---
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [invoicePreview, setInvoicePreview] = useState<InvoicePreview | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState<OrderPaymentResponse | null>(null);
  // Preserved when payment is captured but createOrder fails — allows the user to retry
  // without going through Razorpay again.
  const [pendingOrderRetry, setPendingOrderRetry] = useState<{
    studentIds: number[];
    notes?: string;
    paymentRecordId: number;
  } | null>(null);

  // --- CI order state ---
  const [isCIOrderModalOpen, setIsCIOrderModalOpen] = useState(false);
  const [selectedInstructors, setSelectedInstructors] = useState<number[]>([]);
  const [ciNotes, setCiNotes] = useState("");
  const [ciInvoicePreview, setCiInvoicePreview] = useState<InvoicePreview | null>(null);
  const [loadingCiInvoice, setLoadingCiInvoice] = useState(false);
  const [ciSubmitting, setCiSubmitting] = useState(false);

  const eligibleStudents = useMemo(
    () => students.filter((student) => student.isActive && !student.materialsOrdered),
    [students],
  );
  const activeCIs = useMemo(
    () =>
      courseInstructors.filter(
        (ci) =>
          (ci.status === "Active" || ci.status === "Training") &&
          !ci.materialsOrdered,
      ),
    [courseInstructors],
  );

  // Student invoice preview effect
  useEffect(() => {
    if (!isOrderModalOpen) return;
    if (selectedStudents.length === 0) {
      setInvoicePreview(null);
      return;
    }
    let ignore = false;
    async function loadPreview() {
      try {
        setLoadingInvoice(true);
        const preview = await previewOrderInvoice(selectedStudents);
        if (!ignore) setInvoicePreview(preview);
      } catch (error: any) {
        if (!ignore) {
          toast.error(
            error?.response?.data?.message || "Failed to load invoice preview",
          );
        }
      } finally {
        if (!ignore) setLoadingInvoice(false);
      }
    }
    void loadPreview();
    return () => { ignore = true; };
  }, [isOrderModalOpen, selectedStudents]);

  // CI invoice preview effect
  useEffect(() => {
    if (!isCIOrderModalOpen) return;
    if (selectedInstructors.length === 0) {
      setCiInvoicePreview(null);
      return;
    }
    let ignore = false;
    async function loadCiPreview() {
      try {
        setLoadingCiInvoice(true);
        const preview = await previewCIOrderInvoice(selectedInstructors);
        if (!ignore) setCiInvoicePreview(preview);
      } catch (error: any) {
        if (!ignore) {
          toast.error(
            error?.response?.data?.message || "Failed to load invoice preview",
          );
        }
      } finally {
        if (!ignore) setLoadingCiInvoice(false);
      }
    }
    void loadCiPreview();
    return () => { ignore = true; };
  }, [isCIOrderModalOpen, selectedInstructors]);

  const pendingOrders = orders.filter((order) =>
    [OrderStatus.PENDING, OrderStatus.PROCESSING].includes(
      order.status as OrderStatus,
    ),
  ).length;
  const shippedOrders = orders.filter(
    (order) => order.status === OrderStatus.SHIPPED,
  ).length;
  const deliveredOrders = orders.filter(
    (order) => order.status === OrderStatus.DELIVERED,
  ).length;
  const cancelledOrders = orders.filter(
    (order) => order.status === OrderStatus.CANCELLED,
  ).length;

  function resetStudentDraft() {
    setSelectedStudents([]);
    setNotes("");
    setInvoicePreview(null);
    setSubmitting(false);
  }

  function resetCIDraft() {
    setSelectedInstructors([]);
    setCiNotes("");
    setCiInvoicePreview(null);
    setCiSubmitting(false);
  }


  async function handlePlaceOrder() {
    if (selectedStudents.length === 0) {
      toast.error("Select at least one student to place the order.");
      return;
    }
    if (!invoicePreview) {
      toast.error("Invoice preview is not loaded. Please wait and try again.");
      return;
    }
    try {
      setSubmitting(true);
      const response = await initiateOrderPayment({
        studentIds: selectedStudents,
        notes: notes.trim() || undefined,
        totalAmount: invoicePreview.totalAmount,
      });
      setPaymentData(response);
      setIsOrderModalOpen(false);
      if (response.isZeroAmount || response.amount <= 0) {
        toast.success("Order placed successfully.");
        resetStudentDraft();
        setPaymentData(null);
        await refetchOrders();
        void invalidateAdminOrders();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to place order");
      setSubmitting(false);
    }
  }

  async function handlePlaceCIOrder() {
    if (selectedInstructors.length === 0) {
      toast.error("Select at least one instructor to place the request.");
      return;
    }
    try {
      setCiSubmitting(true);
      await initiateCIOrderPayment({
        instructorIds: selectedInstructors,
        notes: ciNotes.trim() || undefined,
      });
      toast.success("CI material request placed successfully.");
      setIsCIOrderModalOpen(false);
      resetCIDraft();
      await refetchOrders();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to place material request");
    } finally {
      setCiSubmitting(false);
    }
  }

  async function handlePaymentSuccess(response: RazorpaySuccessResponse) {
    const pd = paymentData;
    if (!pd) {
      toast.error("Payment state lost. Please contact support.");
      setSubmitting(false);
      return;
    }
    // Step 1 — verify Razorpay signature. If this fails, payment was not captured.
    try {
      await verifyOrderPayment({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
    } catch (error: any) {
      setPaymentData(null);
      resetStudentDraft();
      setSubmitting(false);
      toast.error(error?.response?.data?.message || "Payment verification failed. Please contact support.");
      return;
    }
    // Step 2 — payment is captured. Create the order. If this fails the money is
    // already collected, so we preserve the retry payload instead of losing it.
    try {
      await createOrder({
        studentIds: pd.studentIds,
        notes: pd.notes,
        paymentRecordId: pd.paymentRecordId,
      });
      toast.success("Payment verified and order placed.");
      setPaymentData(null);
      setPendingOrderRetry(null);
      resetStudentDraft();
      await refetchOrders();
      void invalidateAdminOrders();
    } catch (error: any) {
      setPaymentData(null);
      resetStudentDraft();
      if (pd.paymentRecordId != null) {
        setPendingOrderRetry({
          studentIds: pd.studentIds,
          notes: pd.notes,
          paymentRecordId: pd.paymentRecordId,
        });
        toast.error(
          error?.response?.data?.message ||
            "Order creation failed. Use the retry button to complete your order.",
        );
      } else {
        toast.error(
          error?.response?.data?.message ??
            "Order creation failed and payment record is missing. Please contact support.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetryOrder() {
    if (!pendingOrderRetry) return;
    try {
      setSubmitting(true);
      await createOrder(pendingOrderRetry);
      toast.success("Order placed successfully.");
      setPendingOrderRetry(null);
      await refetchOrders();
      void invalidateAdminOrders();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Order creation failed again. Please contact support.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentFailure(error: any) {
    toast.error(error?.error || "Payment was not completed.");
    setPaymentData(null);
    setSubmitting(false);
  }

  function getLevelDisplay(level: any): string {
    if (typeof level === "string") return level;
    if (level && typeof level === "object" && "name" in level) return level.name;
    if (level && typeof level === "object" && "code" in level) return level.code;
    return String(level || "");
  }

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  if (ordersLoading || studentsLoading || ciLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <TablePageShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Orders</h1>
          <p className="text-muted-foreground">
            Standard order flow for student level materials and first-level kits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsCIOrderModalOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            CI Material Request
          </Button>
          <Button onClick={() => setIsOrderModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New order
          </Button>
        </div>
      </div>

      {cancelledOrders > 0 ? (
        <p className="text-sm text-muted-foreground">
          {cancelledOrders} order{cancelledOrders !== 1 ? "s" : ""} cancelled.
        </p>
      ) : null}

      {pendingOrderRetry && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Your payment was captured but the order was not created. Click <strong>Retry order</strong> to complete it without paying again.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPendingOrderRetry(null)}>
              Dismiss
            </Button>
            <Button size="sm" disabled={submitting} onClick={handleRetryOrder}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Retry order
            </Button>
          </div>
        </div>
      )}

      <OrdersTable orders={orders} loading={ordersLoading} />

      {/* --- Student order dialog --- */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Place standard material order
            </DialogTitle>
            <DialogDescription>
              Select students, review the invoice, then continue to payment if one is required.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select students</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MultiSelectDropdown
                  options={eligibleStudents.map((student) => ({
                    value: student.id,
                    label: student.name,
                    sublabel: `${student.rollNo} | ${getLevelDisplay(student.level)}`,
                  }))}
                  selected={selectedStudents}
                  onChange={setSelectedStudents}
                  placeholder="Select students…"
                  emptyMessage="No eligible students. Students with a pending or fulfilled order for their current level will not appear here."
                />

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    rows={3}
                    placeholder="Any delivery or packing notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <InvoicePreviewCard
              loading={loadingInvoice}
              preview={invoicePreview}
              selected={selectedStudents.length}
              emptyMessage="Select one or more students to generate the order preview."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOrderModalOpen(false);
                resetStudentDraft();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handlePlaceOrder()}
              disabled={selectedStudents.length === 0 || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CI Material Request dialog --- */}
      <Dialog open={isCIOrderModalOpen} onOpenChange={setIsCIOrderModalOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              CI material request
            </DialogTitle>
            <DialogDescription>
              Select course instructors, review the materials list, then place the request.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select instructors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MultiSelectDropdown
                  options={activeCIs.map((ci) => ({
                    value: ci.id,
                    label: ci.name,
                    sublabel: `${ci.instructorId} | ${ci.status}`,
                  }))}
                  selected={selectedInstructors}
                  onChange={setSelectedInstructors}
                  placeholder="Select instructors…"
                  emptyMessage="No eligible instructors. Instructors with materials already ordered will not appear here."
                />

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    rows={3}
                    placeholder="Any delivery or packing notes"
                    value={ciNotes}
                    onChange={(event) => setCiNotes(event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <InvoicePreviewCard
              loading={loadingCiInvoice}
              preview={ciInvoicePreview}
              selected={selectedInstructors.length}
              emptyMessage="Select one or more instructors to preview their training materials."
              zeroAmountLabel="Materials are included in the training fee."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCIOrderModalOpen(false);
                resetCIDraft();
              }}
              disabled={ciSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handlePlaceCIOrder()}
              disabled={selectedInstructors.length === 0 || ciSubmitting}
            >
              {ciSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing request...
                </>
              ) : (
                "Place request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {paymentData && !paymentData.isZeroAmount && paymentData.amount > 0 ? (
        <RazorpayPayment
          key={paymentData.orderId}
          orderId={paymentData.orderId}
          amount={paymentData.amount}
          currency={paymentData.currency}
          franchiseName={paymentData.franchiseName}
          razorpayKey={paymentData.key}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onAbandon={async ({ orderId, reason }) => {
            await abandonOrderPayment({
              paymentId: paymentData.paymentRecordId,
              razorpayOrderId: orderId || undefined,
              note: reason,
            });
          }}
          userDetails={{
            name: user.profile?.name || "",
            email: user.profile?.mail || "",
            phone: user.profile?.phone || "",
          }}
        />
      ) : null}
    </TablePageShell>
  );
}

