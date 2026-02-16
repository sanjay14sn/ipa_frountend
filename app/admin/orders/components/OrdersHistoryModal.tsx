"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getAllOrdersAdmin,
  OrderData,
  OrderStatus,
} from "@/services/order.service";
import FranchiseOrdersDetails from "./FranchiseOrdersDetails";

interface FranchiseOrderGroup {
  franchiseName: string;
  franchiseId: string | number; // Support both formats during transition
  orders: OrderData[];
}

export default function OrdersHistoryModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [franchiseGroups, setFranchiseGroups] = useState<FranchiseOrderGroup[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;

  useEffect(() => {
    if (open) {
      fetchOrders();
    }
  }, [open, currentPage, searchTerm, sortBy, sortOrder]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const result = await getAllOrdersAdmin({
        page: currentPage,
        limit,
        search: searchTerm || undefined,
        // IMPORTANT: no status param here (fetch all)
        sortBy,
        sortOrder,
      });

      const groups: FranchiseOrderGroup[] = Object.entries(result.data).map(
        ([franchiseName, orders]) => ({
          franchiseName,
          franchiseId: orders[0]?.franchiseId || "",
          orders,
        })
      );

      setFranchiseGroups(groups);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (error) {
      console.error("Error fetching order history:", error);
      toast.error("Failed to load order history");
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
            const count = group.orders.filter(
              (o) => o.status === status
            ).length;
            if (count === 0) return null;
            return (
              <Badge
                key={status}
                className={`${getStatusColor(status)} border text-xs`}
              >
                {count} {status}
              </Badge>
            );
          })}
        </div>
      ),
    },
  ];

  const sortOptions: AdminTableSortOption[] = [
    { value: "createdAt", label: "Order Date" },
    { value: "totalAmount", label: "Total Amount" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Order History</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <AdminTable
            data={franchiseGroups}
            loading={loading}
            columns={columns}
            getRowId={(group) => group.franchiseId.toString()}
            renderMainCell={(group) => (
              <div className="flex flex-col">
                <div className="font-medium text-gray-900">
                  {group.franchiseName}
                </div>
                <div className="text-sm text-gray-500">
                  {group.orders.length} order
                  {group.orders.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
            renderExpandedContent={(group) => (
              <FranchiseOrdersDetails
                franchiseId={group.franchiseId.toString()}
                franchiseName={group.franchiseName}
                orders={group.orders}
                lastRow={false}
                expandedRows={expandedChildren}
                onToggleRow={toggleRow}
                onOrderUpdate={fetchOrders}
              />
            )}
            searchPlaceholder="Search by franchise name, order ID, or status..."
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
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
            emptyMessage="No orders found"
            resultsText={(count) => `Showing ${count} franchises`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
