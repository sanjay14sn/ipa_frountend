"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  Loader2,
  Package,
  Plus,
  Receipt,
  Truck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/context/user-context";
import { useStudents } from "@/hooks/api/student.hooks";
import { useFranchiseeOrders } from "@/hooks/api/order.hooks";
import { useCourseInstructors } from "@/hooks/api/course-instructor.hooks";
import { TablePageShell } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import RazorpayPayment, {
  type RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";
import {
  abandonOrderPayment,
  initiateOrderPayment,
  previewOrderInvoice,
  verifyOrderPayment,
  previewCIOrderInvoice,
  initiateCIOrderPayment,
  type InvoicePreview,
  type OrderPaymentResponse,
  OrderStatus,
} from "@/services/order.service";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

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

  // --- CI order state ---
  const [isCIOrderModalOpen, setIsCIOrderModalOpen] = useState(false);
  const [selectedInstructors, setSelectedInstructors] = useState<number[]>([]);
  const [ciNotes, setCiNotes] = useState("");
  const [ciInvoicePreview, setCiInvoicePreview] = useState<InvoicePreview | null>(null);
  const [loadingCiInvoice, setLoadingCiInvoice] = useState(false);
  const [ciSubmitting, setCiSubmitting] = useState(false);

  const activeStudents = useMemo(
    () => students.filter((student) => student.isActive),
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
  const selectedStudentRows = activeStudents.filter((student) =>
    selectedStudents.includes(student.id),
  );
  const selectedCIRows = activeCIs.filter((ci) =>
    selectedInstructors.includes(ci.id),
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

  function toggleStudentSelection(studentId: number) {
    setSelectedStudents((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  function toggleCISelection(ciId: number) {
    setSelectedInstructors((current) =>
      current.includes(ciId)
        ? current.filter((id) => id !== ciId)
        : [...current, ciId],
    );
  }

  async function handlePlaceOrder() {
    if (selectedStudents.length === 0) {
      toast.error("Select at least one student to place the order.");
      return;
    }
    try {
      setSubmitting(true);
      const response = await initiateOrderPayment({
        studentIds: selectedStudents,
        notes: notes.trim() || undefined,
      });
      setPaymentData(response);
      setIsOrderModalOpen(false);
      if (response.isZeroAmount || response.amount <= 0) {
        toast.success("Order placed successfully.");
        resetStudentDraft();
        setPaymentData(null);
        await refetchOrders();
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
    try {
      await verifyOrderPayment({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
      toast.success("Payment verified and order placed.");
      setPaymentData(null);
      resetStudentDraft();
      await refetchOrders();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Payment verification failed",
      );
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
              <CardContent className="space-y-3">
                <div className="max-h-[360px] space-y-2 overflow-y-auto">
                  {activeStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active students available for ordering.
                    </p>
                  ) : (
                    activeStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-accent/40 transition-colors"
                      >
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => toggleStudentSelection(student.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-card-foreground">{student.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {student.rollNo} | {getLevelDisplay(student.level)}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {selectedStudentRows.length > 0 ? (
                  <div className="rounded-lg border border-dashed p-3">
                    <div className="mb-2 text-sm font-medium">Selected students</div>
                    <div className="space-y-2">
                      {selectedStudentRows.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between rounded bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="text-card-foreground">
                            {student.name} | {student.rollNo}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => toggleStudentSelection(student.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

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
              <CardContent className="space-y-3">
                <div className="max-h-[360px] space-y-2 overflow-y-auto">
                  {activeCIs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active course instructors with training levels available.
                    </p>
                  ) : (
                    activeCIs.map((ci) => (
                      <label
                        key={ci.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-accent/40 transition-colors"
                      >
                        <Checkbox
                          checked={selectedInstructors.includes(ci.id)}
                          onCheckedChange={() => toggleCISelection(ci.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-card-foreground">{ci.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {ci.instructorId} | {ci.status}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {selectedCIRows.length > 0 ? (
                  <div className="rounded-lg border border-dashed p-3">
                    <div className="mb-2 text-sm font-medium">Selected instructors</div>
                    <div className="space-y-2">
                      {selectedCIRows.map((ci) => (
                        <div
                          key={ci.id}
                          className="flex items-center justify-between rounded bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="text-card-foreground">
                            {ci.name} | {ci.instructorId}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => toggleCISelection(ci.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

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

function InvoicePreviewCard({
  loading,
  preview,
  selected,
  emptyMessage,
  zeroAmountLabel,
}: {
  loading: boolean;
  preview: InvoicePreview | null;
  selected: number;
  emptyMessage: string;
  zeroAmountLabel?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Invoice preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {selected === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading invoice preview...
          </div>
        ) : preview ? (
          <>
            {preview.lines.length > 0 ? (
              <div className="overflow-hidden rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Line</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Qty</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Unit</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.lines.map((line, index) => (
                      <tr key={`${line.code}-${index}`} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium text-card-foreground">{line.description}</div>
                          <div className="text-xs text-muted-foreground">{line.code}</div>
                        </td>
                        <td className="px-3 py-2 text-card-foreground">{line.quantity}</td>
                        <td className="px-3 py-2 text-card-foreground">
                          {currencyFormatter.format(line.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right text-card-foreground">
                          {currencyFormatter.format(line.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No materials configured for the selected instructors&apos; active training levels.
              </p>
            )}

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preview total</span>
                <span className="text-lg font-semibold text-card-foreground">
                  {currencyFormatter.format(preview.totalAmount)}
                </span>
              </div>
              {zeroAmountLabel && preview.totalAmount === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">{zeroAmountLabel}</p>
              )}
              {!zeroAmountLabel && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Pre-shipment stages such as allocation and backorder stay internal; you will see these orders as Processing until they ship.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Invoice preview is unavailable for the selection.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-card-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
