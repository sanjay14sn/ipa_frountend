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
import {
  useFranchiseeOrders,
  invalidateAdminOrders,
  invalidateFranchiseeOrders,
} from "@/hooks/api/order.hooks";
import { TablePageShell } from "@/components/shared";
import { Button } from "@/components/ui/button";
import OrdersTable from "./components/OrdersTable";
import dynamic from "next/dynamic";
import { type RazorpaySuccessResponse } from "@/components/RazorpayPayment";

const RazorpayPayment = dynamic(
  () => import("@/components/RazorpayPayment"),
  { ssr: false, loading: () => null },
);
import {
  abandonOrderPayment,
  cancelOrderFranchisee,
  createOrder,
  verifyOrderPayment,
  OrderStatus,
  type OrderData,
  type StartingKitItem,
  type CustomMaterialLine,
  type FranchiseKitOrderItem,
} from "@/services/order.service";
import UnifiedMaterialRequestDialog from "./components/UnifiedMaterialRequestDialog";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { ConfirmDialog } from "@/components/shared/dialog";

interface PendingOrderRetry {
  studentIds?: number[];
  instructorIds?: number[];
  startingKitItems?: StartingKitItem[];
  customItems?: CustomMaterialLine[];
  franchiseKitItems?: FranchiseKitOrderItem[];
  franchiseKitProgramId?: number;
  notes?: string;
  paymentRecordId: number;
}

/**
 * sessionStorage key for a captured-payment-but-no-order recovery payload —
 * persisted so a refresh/navigation can't lose the retry affordance.
 */
const PENDING_ORDER_RETRY_KEY = "pending-order-retry";

function writeStoredPendingOrderRetry(value: PendingOrderRetry | null) {
  try {
    if (value == null) {
      sessionStorage.removeItem(PENDING_ORDER_RETRY_KEY);
    } else {
      sessionStorage.setItem(PENDING_ORDER_RETRY_KEY, JSON.stringify(value));
    }
  } catch {
    // Storage unavailable — persistence is best-effort.
  }
}

function readStoredPendingOrderRetry(): PendingOrderRetry | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_RETRY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingOrderRetry;
    return typeof parsed?.paymentRecordId === "number" ? parsed : null;
  } catch {
    return null;
  }
}

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
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  // --- Retry state (preserved when payment is captured but createOrder fails) ---
  const [submitting, setSubmitting] = useState(false);
  // Lazily restored from sessionStorage so refresh/navigation can't lose the
  // recovery affordance (SSR-safe: the reader returns null on the server).
  const [pendingOrderRetry, setPendingOrderRetry] =
    useState<PendingOrderRetry | null>(readStoredPendingOrderRetry);
  const [dismissRetryConfirmOpen, setDismissRetryConfirmOpen] = useState(false);

  const eligibleStudents = useMemo(
    () =>
      students.filter((s) => {
        if (s.status !== "active" || s.materialsOrdered) return false;
        const ord =
          typeof s.level === "object" && s.level != null
            ? (s.level as { displayOrder?: number }).displayOrder
            : undefined;
        return (ord ?? 1) > 1;
      }),
    [students],
  );

  // Custom (re-order) items are for students who have ALREADY ordered materials.
  const customEligibleStudents = useMemo(
    () => students.filter((s) => s.status === "active" && s.materialsOrdered),
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
      toast.error(
        getUserFriendlyMessage(
          error,
          "Payment verification failed. Please contact support.",
        ),
      );
      return;
    }
    try {
      await createOrder({
        studentIds: pd.studentIds,
        instructorIds: pd.instructorIds,
        startingKitItems: pd.startingKitItems,
        customItems: pd.customItems,
        franchiseKitItems: pd.franchiseKitItems,
        franchiseKitProgramId: pd.franchiseKitProgramId,
        notes: pd.notes,
        paymentRecordId: pd.paymentRecordId,
      });
      toast.success("Payment verified and order placed.");
      setUnifiedPaymentData(null);
      setPendingOrderRetry(null);
      writeStoredPendingOrderRetry(null);
      await refetchOrders();
      void invalidateAdminOrders();
    } catch (error: any) {
      setUnifiedPaymentData(null);
      if (pd.paymentRecordId != null) {
        const retry: PendingOrderRetry = {
          studentIds: pd.studentIds,
          instructorIds: pd.instructorIds,
          startingKitItems: pd.startingKitItems,
          customItems: pd.customItems,
          franchiseKitItems: pd.franchiseKitItems,
          franchiseKitProgramId: pd.franchiseKitProgramId,
          notes: pd.notes,
          paymentRecordId: pd.paymentRecordId,
        };
        setPendingOrderRetry(retry);
        writeStoredPendingOrderRetry(retry);
        toast.error(
          getUserFriendlyMessage(
            error,
            "Order creation failed. Use the retry button to complete your order.",
          ),
        );
      } else {
        toast.error(
          getUserFriendlyMessage(
            error,
            "Order creation failed and payment record is missing. Please contact support.",
          ),
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
      await createOrder({
        studentIds: pendingOrderRetry.studentIds,
        instructorIds: pendingOrderRetry.instructorIds,
        startingKitItems: pendingOrderRetry.startingKitItems,
        customItems: pendingOrderRetry.customItems,
        franchiseKitItems: pendingOrderRetry.franchiseKitItems,
        franchiseKitProgramId: pendingOrderRetry.franchiseKitProgramId,
        notes: pendingOrderRetry.notes,
        paymentRecordId: pendingOrderRetry.paymentRecordId,
      });
      toast.success("Order placed successfully.");
      setPendingOrderRetry(null);
      writeStoredPendingOrderRetry(null);
      await refetchOrders();
      void invalidateAdminOrders();
    } catch (error: any) {
      toast.error(
        getUserFriendlyMessage(
          error,
          "Order creation failed again. Please contact support.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentFailure(error: any) {
    toast.error(getUserFriendlyMessage(error, "Payment was not completed."));
    setUnifiedPaymentData(null);
    setSubmitting(false);
  }

  async function handleCancelOrder(order: OrderData) {
    try {
      setCancellingOrderId(order.id);
      await cancelOrderFranchisee(order.id);
      const paymentStatus = String(order.paymentStatus ?? "").toUpperCase();
      toast.success(
        paymentStatus === "PAID"
          ? "Order cancelled. Refund has been initiated."
          : // REFUNDED (payment already returned) and unpaid orders alike:
            // nothing more is owed, so no refund messaging.
            "Order cancelled.",
      );
      await refetchOrders();
      void invalidateFranchiseeOrders();
      void invalidateAdminOrders();
    } catch (error: any) {
      toast.error(
        getUserFriendlyMessage(
          error,
          "This order cannot be cancelled from its current status.",
        ),
      );
    } finally {
      setCancellingOrderId(null);
    }
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
    <TablePageShell
      title="Material Orders"
      description="Order student level materials and first-level kits, or re-order custom items for students who already have materials."
      actions={
        <Button onClick={() => setIsUnifiedModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Material Request
        </Button>
      }
    >

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
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDismissRetryConfirmOpen(true)}
            >
              Dismiss
            </Button>
            <Button size="sm" disabled={submitting} onClick={handleRetryOrder}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Retry order
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={dismissRetryConfirmOpen}
        onOpenChange={setDismissRetryConfirmOpen}
        variant="destructive"
        title="Dismiss payment recovery?"
        description="You paid for this order but it wasn't created yet. If you dismiss, contact support with your payment reference."
        confirmLabel="Dismiss"
        onConfirm={() => {
          setPendingOrderRetry(null);
          writeStoredPendingOrderRetry(null);
          setDismissRetryConfirmOpen(false);
        }}
      />

      <OrdersTable
        orders={orders}
        loading={ordersLoading}
        cancellingOrderId={cancellingOrderId}
        onCancelOrder={handleCancelOrder}
      />

      <UnifiedMaterialRequestDialog
        open={isUnifiedModalOpen}
        onClose={() => setIsUnifiedModalOpen(false)}
        onPaymentInitiated={(data) => {
          setUnifiedPaymentData(data);
          setIsUnifiedModalOpen(false);
        }}
        eligibleStudents={eligibleStudents}
        customEligibleStudents={customEligibleStudents}
      />

      {unifiedPaymentData && !unifiedPaymentData.isZeroAmount && unifiedPaymentData.amount > 0 ? (
        <ComponentErrorBoundary componentName="RazorpayPayment">
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
        </ComponentErrorBoundary>
      ) : null}
    </TablePageShell>
  );
}
