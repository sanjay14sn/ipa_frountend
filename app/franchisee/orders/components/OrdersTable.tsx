"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { DataTable } from "@/components/shared";
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

interface OrdersTableProps {
  orders?: OrderData[];
  onViewOrderDetails?: (orderId: number) => void;
  loading?: boolean;
}

export default function OrdersTable({
  orders,
  onViewOrderDetails,
  loading = false,
}: OrdersTableProps) {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
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

  const toggleRow = (id: string) => {
    if (id.includes("-")) {
      // This is a student section toggle
      const newExpandedChildren = new Set<string>();

      // If it's already expanded, collapse it (set will be empty)
      // Otherwise, only add this one (ensuring only one is expanded)
      if (!expandedChildren.has(id)) {
        newExpandedChildren.add(id);
      }

      setExpandedChildren(newExpandedChildren);
    }
  };

  const getStatusColor = (status: OrderStatus | string) => {
    switch (status as OrderStatus) {
      case OrderStatus.DELIVERED:
        return "bg-green-100 text-green-800 border-green-200";
      case OrderStatus.SHIPPED:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case OrderStatus.PROCESSING:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case OrderStatus.PENDING:
        return "bg-orange-100 text-orange-800 border-orange-200";
      case OrderStatus.CANCELLED:
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
      header: "Order Type",
      className: "text-center",
      render: (order) => (
        <Badge variant="outline" className="text-xs">
          {order.orderType}
        </Badge>
      ),
    },
    {
      key: "students",
      header: "Students / CIs",
      className: "text-center",
      render: (order) => (
        <div className="font-medium">
          {order.totalStudents || 0}
          {order.totalInstructors && order.totalInstructors > 0 && (
            <span className="text-xs text-muted-foreground block">
              + {order.totalInstructors} CI{order.totalInstructors > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      className: "text-center",
      render: (order) => (
        <div className="font-medium">{order.totalItems || 0}</div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (order) => (
        <Badge className={`${getStatusColor(order.status)} border`}>
          {order.status}
        </Badge>
      ),
    },
    {
      key: "orderDate",
      header: "Order Date",
      className: "text-center",
      render: (order) => (
        <div className="text-sm">
          {new Date(order.createdAt).toLocaleDateString()}
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
    <DataTable
      data={paginatedData}
      loading={loading}
      columns={columns}
      getRowId={(order) => order.id.toString()}
      renderMainCell={(order) => (
        <span className="font-medium text-card-foreground">Order #{order.id}</span>
      )}
      renderExpandedContent={(order) => (
        <OrderDetails
          order={order}
          lastRow={false}
          expandedRows={expandedChildren}
          onToggleRow={toggleRow}
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
  );
}
