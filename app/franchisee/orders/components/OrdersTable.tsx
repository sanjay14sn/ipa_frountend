"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, IndianRupee } from "lucide-react";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import {
  OrderData,
  OrderStatus,
} from "@/services/order.service";
import OrderDetails from "./OrderDetails";

interface OrdersTableProps {
  orders?: OrderData[];
  onViewOrderDetails?: (orderId: number) => void;
}

export default function OrdersTable({
  orders,
  onViewOrderDetails,
}: OrdersTableProps) {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"orderDate" | "totalAmount">(
    "orderDate"
  );
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
        case "totalAmount":
          comparison =
            a.totalAmount as number - (b.totalAmount as number);
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

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
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
  const columns: AdminTableColumn<OrderData>[] = [
    {
      key: "order",
      header: "Order ID",
      className: "w-[200px]",
    },
    {
      key: "students",
      header: "Students",
      className: "text-center",
      render: (order) => (
        <div className="font-medium">{order.totalStudents || 0}</div>
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
      key: "totalAmount",
      header: "Total Amount",
      className: "text-center",
      render: (order) => (
        <div className="font-medium flex items-center justify-center gap-1">
          <IndianRupee className="h-4 w-4" />
          {order.totalAmount}
        </div>
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

  const filters: AdminTableFilter[] = [
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

  const sortOptions: AdminTableSortOption[] = [
    { value: "orderDate", label: "Order Date" },
    { value: "totalAmount", label: "Total Amount" },
  ];

  return (
    <AdminTable
      data={paginatedData}
      loading={false}
      columns={columns}
      getRowId={(order) => order.id.toString()}
      renderMainCell={(order) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">
            Order #{order.id}
          </div>
          <div className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString()}
          </div>
          {order.notes && (
            <div className="text-xs text-gray-400 truncate max-w-[200px]">
              {order.notes}
            </div>
          )}
        </div>
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
        setSortBy(newSortBy as "orderDate" | "totalAmount");
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
