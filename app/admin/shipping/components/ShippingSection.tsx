"use client";

import { useRef, createRef, useState, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderData, OrderStatus, verifyOrderAdmin, getDcPdfUrl, regenerateDcPdf } from "@/services/order.service";
import { NestedSection } from "@/components/shared";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronRight, FileText, RotateCcw } from "lucide-react";
import OrderDetails from "../../orders/components/OrderDetails";

interface ShippingSectionProps {
  orders: OrderData[];
  franchiseId: string;
  franchiseName: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onOrderUpdate: () => void;
}

export let shippingDotRef = createRef<HTMLDivElement>();

export default function ShippingSection({
  orders,
  franchiseId,
  franchiseName,
  isExpanded,
  onToggle,
  onOrderUpdate,
}: ShippingSectionProps) {
  shippingDotRef = useRef<HTMLDivElement>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [regeneratingOrderId, setRegeneratingOrderId] = useState<number | null>(null);
  const [expandedOrderRows, setExpandedOrderRows] = useState<Set<number>>(new Set());
  const [expandedStudentRows, setExpandedStudentRows] = useState<Set<string>>(new Set());

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

  const handleRegenerateDc = async (orderId: number) => {
    try {
      setRegeneratingOrderId(orderId);
      await regenerateDcPdf(orderId);
      toast.success(`DC PDF regenerated for Order #${orderId}`);
      onOrderUpdate();
    } catch (error: any) {
      console.error("Error regenerating DC PDF:", error);
      toast.error(error.response?.data?.message || "Failed to regenerate DC PDF");
    } finally {
      setRegeneratingOrderId(null);
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
    const newExpanded = new Set(expandedStudentRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedStudentRows(newExpanded);
  };

  return (
    <div ref={shippingDotRef}>
      <NestedSection
        id={`${franchiseId}-orders`}
        title={`Orders (${orders.length})`}
        badge={<Badge variant="secondary">₹{getTotalAmount().toLocaleString("en-IN")}</Badge>}
        isExpanded={isExpanded}
        onToggle={onToggle}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Order ID</TableHead>
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
                    <button onClick={() => toggleOrderRow(order.id)} className="p-1 hover:bg-gray-100 rounded">
                      {expandedOrderRows.has(order.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">#{order.id}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{order.totalStudents || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{order.totalItems || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    ₹{parseFloat(order.totalAmount as string).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${getStatusColor(order.status)} border`}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {order.status === OrderStatus.SHIPPING || String(order.status).toUpperCase() === "SHIPPING" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (order.dcPdfPath) {
                                const url = getDcPdfUrl(order.dcPdfPath);
                                window.open(url, "_blank");
                              } else {
                                toast.error("DC PDF is being generated. Please refresh the page.");
                              }
                            }}
                            disabled={!order.dcPdfPath}
                            className="bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                            title={order.dcPdfPath ? "View Delivery Challan" : "DC PDF is being generated"}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            View DC
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateDc(order.id)}
                            disabled={regeneratingOrderId === order.id}
                            className="bg-green-50 hover:bg-green-100"
                            title="Regenerate DC PDF"
                          >
                            {regeneratingOrderId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </Button>
                        </>
                      ) : null}
                      {order.status !== OrderStatus.SHIPPING && 
                       String(order.status).toUpperCase() !== "SHIPPING" && (
                        <span className="text-xs text-muted-foreground">No actions</span>
                      )}
                    </div>
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


