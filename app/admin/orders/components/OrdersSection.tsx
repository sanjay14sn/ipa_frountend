"use client";

import { useRef, createRef, useState, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  OrderData,
  OrderStatus,
  updateOrderAdmin,
  verifyOrderAdmin,
} from "@/services/order.service";
import { NestedSection } from "@/components/shared";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import OrderDetails from "./OrderDetails";

interface OrdersSectionProps {
  orders: OrderData[];
  franchiseName: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onOrderUpdate: () => void;
}

export let ordersDotRef = createRef<HTMLDivElement>();

export default function OrdersSection({
  orders,
  franchiseName,
  isExpanded,
  onToggle,
  onOrderUpdate,
}: OrdersSectionProps) {
  ordersDotRef = useRef<HTMLDivElement>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [expandedOrderRows, setExpandedOrderRows] = useState<Set<number>>(
    new Set()
  );
  const [expandedStudentRows, setExpandedStudentRows] = useState<Set<string>>(
    new Set()
  );

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
        return "bg-green-100 text-green-800 border-green-200";
      case OrderStatus.SHIPPING:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case OrderStatus.VERIFIED:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case OrderStatus.PENDING:
        return "bg-orange-100 text-orange-800 border-orange-200";
      case OrderStatus.CANCELLED:
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleStatusUpdate = async (
    orderId: number,
    newStatus: OrderStatus
  ) => {
    try {
      setUpdatingOrderId(orderId);
      await updateOrderAdmin(orderId, { status: newStatus });
      toast.success(`Order #${orderId} status updated to ${newStatus}`);
      onOrderUpdate();
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update order status"
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleVerify = async (orderId: number) => {
    try {
      setUpdatingOrderId(orderId);
      await verifyOrderAdmin(orderId, "verified");
      toast.success(`Order #${orderId} verified and sent to shipping`);
      onOrderUpdate();
    } catch (error: any) {
      console.error("Error verifying order:", error);
      toast.error(error.response?.data?.message || "Failed to verify order");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancel = async (orderId: number) => {
    try {
      setUpdatingOrderId(orderId);
      await verifyOrderAdmin(orderId, "cancel");
      toast.success(`Order #${orderId} cancelled`);
      onOrderUpdate();
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast.error(error.response?.data?.message || "Failed to cancel order");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getTotalAmount = () => {
    return orders.reduce(
      (acc, order) => acc + (parseFloat(order.totalAmount as string) || 0),
      0
    );
  };

  const toggleOrderRow = (orderId: number) => {
    const newExpanded = new Set(expandedOrderRows);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrderRows(newExpanded);
  };

  const handleOrderToggleRow = (id: string) => {
    // Handle nested student row toggles
    const newExpanded = new Set(expandedStudentRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedStudentRows(newExpanded);
  };

  return (
    <div ref={ordersDotRef}>
      <NestedSection
        id={`${franchiseName}-orders`}
        title={`Orders (${orders.length})`}
        badge={
          <Badge variant="secondary">
            ₹{getTotalAmount().toLocaleString("en-IN")}
          </Badge>
        }
        isExpanded={isExpanded}
        onToggle={onToggle}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead className="text-center">Order Type</TableHead>
              <TableHead className="text-center">Students</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-center">Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Date</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, index) => (
              <Fragment key={order.id}>
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell>
                    <button
                      onClick={() => toggleOrderRow(order.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedOrderRows.has(order.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      #{order.id}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {order.orderType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {order.totalStudents || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{order.totalItems || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    ₹
                    {parseFloat(order.totalAmount as string).toLocaleString(
                      "en-IN"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${getStatusColor(order.status)} border`}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {order.status === OrderStatus.PENDING ||
                    String(order.status).toUpperCase() === "PENDING" ? (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleVerify(order.id)}
                          disabled={updatingOrderId === order.id}
                        >
                          {updatingOrderId === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(order.id)}
                          disabled={updatingOrderId === order.id}
                          className="border border-black bg-transparent text-black hover:bg-red-900 hover:text-white"
                        >
                          {updatingOrderId === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Cancel"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No actions
                      </span>
                    )}
                  </TableCell>
                </TableRow>
                {expandedOrderRows.has(order.id) && (
                  <TableRow key={`${order.id}-details`}>
                    <TableCell colSpan={8} className="p-0">
                      <OrderDetails
                        order={order}
                        expandedRows={expandedStudentRows}
                        onToggleRow={handleOrderToggleRow}
                        lastRow={index === orders.length - 1}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </NestedSection>
    </div>
  );
}
