"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AdminTable } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import {
  getAllOrdersAdmin,
  OrderData,
  OrderStatus,
} from "@/services/order.service";
import { toast } from "sonner";
import FranchiseShippingDetails from "./FranchiseShippingDetails";
import OrdersHistoryModal from "../../orders/components/OrdersHistoryModal";

interface FranchiseOrderGroup {
  franchiseName: string;
  franchiseId: number;
  orders: OrderData[];
}

export default function AdminShippingTable() {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());
  const [franchiseGroups, setFranchiseGroups] = useState<FranchiseOrderGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  // Hardcode status as SHIPPING for admin Shipping page
  const statusFilter = OrderStatus.SHIPPING;
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm, sortBy, sortOrder]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const result = await getAllOrdersAdmin({
        page: currentPage,
        limit,
        search: searchTerm || undefined,
        status: statusFilter,
        sortBy,
        sortOrder,
      });

      const groups: FranchiseOrderGroup[] = Object.entries(result.data).map(
        ([franchiseName, orders]) => ({
          franchiseName,
          franchiseId: orders[0]?.franchiseId || 0,
          orders,
        })
      );

      setFranchiseGroups(groups);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    if (id.includes("-")) {
      const newExpandedChildren = new Set(expandedChildren);
      if (newExpandedChildren.has(id)) {
        newExpandedChildren.delete(id);
      } else {
        newExpandedChildren.add(id);
      }
      setExpandedChildren(newExpandedChildren);
    }
  };

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

  const getTotalOrdersCount = () => {
    return franchiseGroups.reduce((acc, group) => acc + group.orders.length, 0);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const getTotalAmount = (orders: OrderData[]) => {
    return orders.reduce(
      (acc, order) => acc + (parseFloat(order.totalAmount as string) || 0),
      0
    );
  };

  const columns: AdminTableColumn<FranchiseOrderGroup>[] = [
    { key: "franchise", header: "Franchise", className: "w-[300px]" },
    {
      key: "orders",
      header: "Orders",
      className: "text-center",
      render: (group) => (
        <Badge variant="secondary">
          {group.orders.length} order{group.orders.length !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      className: "text-center",
      render: (group) => (
        <span className="font-medium">
          ₹{getTotalAmount(group.orders).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status Summary",
      className: "text-center",
      render: (group) => (
        <div className="flex flex-col items-center gap-1">
          {Object.values(OrderStatus).map((status) => {
            const count = group.orders.filter((o) => o.status === status).length;
            if (count === 0) return null;
            return (
              <Badge key={status} className={`${getStatusColor(status)} border text-xs`}>
                {count} {status}
              </Badge>
            );
          })}
        </div>
      ),
    },
  ];

  // Status filter UI removed as status is hardcoded

  const sortOptions: AdminTableSortOption[] = [
    { value: "createdAt", label: "Order Date" },
    { value: "totalAmount", label: "Total Amount" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)}>
          History
        </Button>
      </div>

      <OrdersHistoryModal open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />
      <AdminTable
        data={franchiseGroups}
        loading={loading}
        columns={columns}
        getRowId={(group) => group.franchiseId.toString()}
        renderMainCell={(group) => (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">{group.franchiseName}</div>
            <div className="text-sm text-gray-500">
              {group.orders.length} order{group.orders.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
        renderExpandedContent={(group) => (
          <FranchiseShippingDetails
            franchiseName={group.franchiseName}
            orders={group.orders}
            lastRow={false}
            expandedRows={expandedChildren}
            onToggleRow={toggleRow}
            onOrderUpdate={fetchOrders}
          />
        )}
        searchPlaceholder="Search by franchise name, order ID, or status..."
        onSearchChange={handleSearchChange}
        // Status filter disabled; hardcoded to SHIPPING
        sortOptions={sortOptions}
        defaultSortBy="createdAt"
        defaultSortOrder="DESC"
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
        pagination={{ total, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={limit}
        emptyMessage="No orders found matching your criteria"
        resultsText={(count) => `Showing ${getTotalOrdersCount()} orders from ${count} franchises`}
      />
    </div>
  );
}


