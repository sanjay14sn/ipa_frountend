"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import {
  GroupedPaymentData,
  getPaginatedAdminPayments,
} from "@/services/payment.service";
import FranchisePaymentsDetails from "./FranchisePaymentsDetails";

interface FranchisePaymentGroup {
  franchiseName: string;
  payments: any[];
}

export default function PaymentsTable() {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [franchiseGroups, setFranchiseGroups] = useState<
    FranchisePaymentGroup[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;

  // Fetch data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const result = await getPaginatedAdminPayments({
          page: currentPage,
          limit,
          search: searchTerm,
          status: statusFilter === "all" ? undefined : statusFilter,
          sortBy,
          sortOrder,
        });

        // Convert grouped data to array
        const groups: FranchisePaymentGroup[] = Object.entries(result.data).map(
          ([franchiseName, payments]) => ({
            franchiseName,
            payments,
          })
        );

        setFranchiseGroups(groups);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

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

  const getTotalPaymentsCount = () => {
    return franchiseGroups.reduce(
      (acc, group) => acc + group.payments.length,
      0
    );
  };

  // Table configuration
  const columns: AdminTableColumn<FranchisePaymentGroup>[] = [
    {
      key: "franchise",
      header: "Franchise",
      className: "w-[300px]",
    },
    {
      key: "payments",
      header: "Payments",
      className: "text-center",
      render: (group) => (
        <Badge variant="secondary">
          {group.payments.length} payment
          {group.payments.length !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      className: "text-center",
      render: (group) => {
        // Calculate only completed amount, excluding cancelled/failed payments
        const completedAmount = group.payments
          .filter((p) => p.status === "completed")
          .reduce((acc, p) => acc + p.amount, 0);

        return (
          <span className="font-medium">
            ₹{completedAmount.toLocaleString("en-IN")}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (group) => (
        <Badge variant="outline">
          {group.payments.filter((p) => p.status === "completed").length}{" "}
          completed
        </Badge>
      ),
    },
  ];

  const filters: AdminTableFilter[] = [
    {
      key: "status",
      label: "Filter by status",
      options: [
        { value: "all", label: "All Status" },
        { value: "pending", label: "Pending" },
        { value: "completed", label: "Completed" },
        { value: "failed", label: "Failed" },
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: AdminTableSortOption[] = [
    { value: "createdAt", label: "Date" },
    { value: "amount", label: "Amount" },
  ];

  return (
    <AdminTable
      data={franchiseGroups}
      loading={loading}
      columns={columns}
      getRowId={(group) => group.franchiseName}
      renderMainCell={(group) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{group.franchiseName}</div>
          <div className="text-sm text-gray-500">
            {group.payments[0]?.franchisee?.mail || "N/A"}
          </div>
        </div>
      )}
      renderExpandedContent={(group) => (
        <FranchisePaymentsDetails
          franchiseName={group.franchiseName}
          payments={group.payments}
          lastRow={false}
          expandedRows={expandedChildren}
          onToggleRow={toggleRow}
        />
      )}
      searchPlaceholder="Search by order ID..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
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
      emptyMessage="No payments found matching your criteria"
      resultsText={(count, total) =>
        `Showing ${getTotalPaymentsCount()} of ${total} payments`
      }
    />
  );
}
