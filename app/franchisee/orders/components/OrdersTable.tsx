"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Loader2, X } from "lucide-react";
import { DataTable, StatusBadge, type StatusTone } from "@/components/shared";
import { orderTypeBadgeClass, orderTypeLabel } from "@/lib/payment-details-display";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import {
  OrderData,
  OrderStatus,
} from "@/services/order.service";
import OrderDetails from "./OrderDetails";
import OrderInvoiceDialog from "./OrderInvoiceDialog";

interface OrdersTableProps {
  orders?: OrderData[];
  onViewOrderDetails?: (orderId: number) => void;
  onCancelOrder?: (order: OrderData) => Promise<void> | void;
  cancellingOrderId?: number | null;
  loading?: boolean;
}

export default function OrdersTable({
  orders,
  onViewOrderDetails,
  onCancelOrder,
  cancellingOrderId = null,
  loading = false,
}: OrdersTableProps) {
  const [invoiceOrderId, setInvoiceOrderId] = useState<number | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"orderDate">("orderDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!orders) {
      return [];
    }

    let filtered = orders.filter((order) => {
      const matchesSearch =
        order.id.toString().includes(searchTerm) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "orderDate":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getStatusTone = (status: OrderStatus | string): StatusTone => {
    switch (status as OrderStatus) {
      case OrderStatus.DELIVERED:
        return "success";
      case OrderStatus.SHIPPED:
        return "info";
      case OrderStatus.PROCESSING:
      case OrderStatus.PENDING:
        return "warning";
      case OrderStatus.CANCELLED:
        return "destructive";
      default:
        return "neutral";
    }
  };

  // Table configuration
  const columns: DataTableColumn<OrderData>[] = [
    {
      key: "order",
      header: "Order ID",
      className: "w-[200px]",
    },
    {
      key: "orderType",
      header: "Type",
      className: "text-center",
      render: (order) => (
        <Badge variant="outline" className={orderTypeBadgeClass(order.orderType)}>
          {orderTypeLabel(order.orderType)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (order) => (
        <div className="flex items-center justify-center gap-1">
          <StatusBadge tone={getStatusTone(order.status)} label={order.status} />
          {String(order.paymentStatus ?? "").toUpperCase() === "REFUNDED" ? (
            <StatusBadge tone="neutral" label="Refunded" />
          ) : null}
        </div>
      ),
    },
    {
      key: "value",
      header: "Value",
      className: "text-center",
      render: (order) => {
        const total = Number(order.totalAmount);
        const subtotal =
          order.subtotalAmount != null ? Number(order.subtotalAmount) : null;
        const gst = order.gstAmount != null ? Number(order.gstAmount) : null;
        const showBreakdown =
          subtotal != null && gst != null && gst > 0;
        return (
          <span
            className="font-medium"
            title={
              showBreakdown
                ? `Subtotal ₹${subtotal.toFixed(2)} + GST ₹${gst.toFixed(2)} = Total ₹${total.toFixed(2)}`
                : undefined
            }
          >
            ₹{total.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      render: (order) =>
        order.createdAt
          ? new Date(order.createdAt).toLocaleDateString("en-IN")
          : "—",
    },
    {
      key: "students",
      header: "Students / CIs",
      className: "text-center",
      render: (order) => {
        const s = order.totalStudents ?? 0;
        const c = order.totalInstructors ?? 0;
        const total = s + c;
        return <span>{total > 0 ? total : "—"}</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (order) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            title="View invoice"
            onClick={(e) => {
              e.stopPropagation();
              setInvoiceOrderId(order.id);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
          {order.canCancel ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              title="Cancel order"
              disabled={cancellingOrderId === order.id}
              onClick={(e) => {
                e.stopPropagation();
                setCancelOrder(order);
              }}
            >
              {cancellingOrderId === order.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: OrderStatus.PENDING, label: "Pending" },
        { value: OrderStatus.PROCESSING, label: "Processing" },
        { value: OrderStatus.SHIPPED, label: "Shipped" },
        { value: OrderStatus.DELIVERED, label: "Delivered" },
        { value: OrderStatus.CANCELLED, label: "Cancelled" },
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "orderDate", label: "Order Date" },
  ];

  return (
    <>
    <DataTable
      data={paginatedData}
      loading={loading}
      columns={columns}
      getRowId={(order) => order.id.toString()}
      renderMainCell={(order) => (
        <span className="font-medium">Order #{order.id}</span>
      )}
      renderExpandedContent={(order) => (
        <OrderDetails
          order={order}
          lastRow={false}
        />
      )}
      searchPlaceholder="Search orders by number or status..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
      }}
      sortOptions={sortOptions}
      defaultSortBy="orderDate"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy as "orderDate");
        setSortOrder(newSortOrder.toLowerCase() as "asc" | "desc");
      }}
      pagination={{ total: filteredData.length, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      emptyMessage="No orders found matching your criteria"
      resultsText={(count, total) => `Showing ${count} of ${total} orders`}
    />
    <OrderInvoiceDialog
      orderId={invoiceOrderId}
      onClose={() => setInvoiceOrderId(null)}
    />
    <AlertDialog
      open={cancelOrder !== null}
      onOpenChange={(open) => {
        if (!open) setCancelOrder(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel order?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel Order #{cancelOrder?.id}. If payment was captured,
            a full refund will be initiated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep order</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={cancelOrder != null && cancellingOrderId === cancelOrder.id}
            onClick={(event) => {
              event.preventDefault();
              if (!cancelOrder || !onCancelOrder) return;
              void Promise.resolve(onCancelOrder(cancelOrder)).finally(() => {
                setCancelOrder(null);
              });
            }}
          >
            {cancelOrder != null && cancellingOrderId === cancelOrder.id ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Cancel order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
