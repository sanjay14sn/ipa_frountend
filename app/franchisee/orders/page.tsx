"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/context/user-context";
import { useStudents } from "@/hooks/api/student.hooks";
import { useFranchiseeOrders, invalidateAdminOrders } from "@/hooks/api/order.hooks";
import { TablePageShell } from "@/components/shared";
import { Button } from "@/components/ui/button";
import OrdersTable from "./components/OrdersTable";
import RazorpayPayment, {
  type RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";
import {
  abandonOrderPayment,
  createOrder,
  verifyOrderPayment,
  OrderStatus,
  type StartingKitItem,
} from "@/services/order.service";
import UnifiedMaterialRequestDialog from "./components/UnifiedMaterialRequestDialog";

export default function FranchiseeOrdersPage() {
  const { user } = useUser();
  const { students, isLoading: studentsLoading } = useStudents();
  const {
    orders,
    isLoading: ordersLoading,
    revalidate: refetchOrders,
  } = useFranchiseeOrders(undefined, Boolean(user?.franchiseId));

  // --- Unified modal state ---
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [unifiedPaymentData, setUnifiedPaymentData] = useState<any>(null);

  // --- Retry state (preserved when payment is captured but createOrder fails) ---
  const [submitting, setSubmitting] = useState(false);
  const [pendingOrderRetry, setPendingOrderRetry] = useState<{
    studentIds?: number[];
    instructorIds?: number[];
    startingKitItems?: StartingKitItem[];
    notes?: string;
    paymentRecordId: number;
  } | null>(null);

  const eligibleStudents = useMemo(
    () =>
      students.filter((s) => {
        if (!s.isActive || s.materialsOrdered) return false;
        const ord =
          typeof s.level === "object" && s.level != null
            ? (s.level as { displayOrder?: number }).displayOrder
            : undefined;
        return (ord ?? 1) > 1;
      }),
    [students],
  );

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

  async function handlePaymentSuccess(response: RazorpaySuccessResponse) {
    const pd = unifiedPaymentData;
    if (!pd) {
      toast.error("Payment state lost. Please contact support.");
      setSubmitting(false);
      return;
    }
    try {
      await verifyOrderPayment({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
    } catch (error: any) {
      setUnifiedPaymentData(null);
      setSubmitting(false);
      toast.error(error?.response?.data?.message || "Payment verification failed. Please contact support.");
      return;
    }
    try {
      await createOrder({
        studentIds: pd.studentIds,
        instructorIds: pd.instructorIds,
        startingKitItems: pd.startingKitItems,
        notes: pd.notes,
        paymentRecordId: pd.paymentRecordId,
      });
      toast.success("Payment verified and order placed.");
      setUnifiedPaymentData(null);
      setPendingOrderRetry(null);
      await refetchOrders();
      void invalidateAdminOrders();
    } catch (error: any) {
      setUnifiedPaymentData(null);
      if (pd.paymentRecordId != null) {
        setPendingOrderRetry({
          studentIds: pd.studentIds,
          instructorIds: pd.instructorIds,
          startingKitItems: pd.startingKitItems,
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
    setUnifiedPaymentData(null);
    setSubmitting(false);
  }

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  if (ordersLoading || studentsLoading) {
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
          <Button onClick={() => setIsUnifiedModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Material Request
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

      <UnifiedMaterialRequestDialog
        open={isUnifiedModalOpen}
        onClose={() => setIsUnifiedModalOpen(false)}
        onPaymentInitiated={(data) => {
          setUnifiedPaymentData(data);
          setIsUnifiedModalOpen(false);
        }}
        eligibleStudents={eligibleStudents}
      />

      {unifiedPaymentData && !unifiedPaymentData.isZeroAmount && unifiedPaymentData.amount > 0 ? (
        <RazorpayPayment
          key={unifiedPaymentData.orderId}
          orderId={unifiedPaymentData.orderId}
          amount={unifiedPaymentData.amount}
          currency={unifiedPaymentData.currency}
          franchiseName={unifiedPaymentData.franchiseName}
          razorpayKey={unifiedPaymentData.key}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onAbandon={async ({ orderId, reason }) => {
            await abandonOrderPayment({
              paymentId: unifiedPaymentData.paymentRecordId,
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
