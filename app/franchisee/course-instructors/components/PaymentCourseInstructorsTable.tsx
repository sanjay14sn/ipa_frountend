"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import { CourseInstructorData } from "@/services/course-instructor.service";
import {
  initiateCITrainingPayment,
  verifyCITrainingPayment,
  CITrainingPaymentOrderResponse,
  VerifyPaymentDto,
} from "@/services/payment.service";
import RazorpayPayment, {
  RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";
import { useUser } from "@/context/user-context";
import { toast } from "sonner";

interface PaymentCourseInstructorsTableProps {
  courseInstructors?: CourseInstructorData[];
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
  ) => void;
}

export default function PaymentCourseInstructorsTable({
  courseInstructors,
  onCourseInstructorUpdate,
}: PaymentCourseInstructorsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "dateJoined" | "city">(
    "dateJoined"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [processingPayment, setProcessingPayment] = useState<number | null>(
    null
  );
  const [paymentData, setPaymentData] = useState<{
    ciId: number;
    orderData: CITrainingPaymentOrderResponse;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { user } = useUser();
  const itemsPerPage = 10;

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!courseInstructors) {
      return [];
    }

    let filtered = courseInstructors.filter((courseInstructor) => {
      const matchesSearch =
        courseInstructor.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.instructorId
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || courseInstructor.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "dateJoined":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "city":
          comparison = a.city.localeCompare(b.city);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [courseInstructors, searchTerm, statusFilter, sortBy, sortOrder]);

  // Paginate the filtered data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const handlePayment = async (id: number) => {
    if (processingPayment === id || isProcessingPayment) return;

    try {
      setProcessingPayment(id);
      setIsProcessingPayment(true);
      const orderData = await initiateCITrainingPayment(id);

      // If zero amount, handle directly
      if (orderData.amount === 0) {
        toast.success(
          orderData.message ||
            "Payment completed successfully! CI moved to training status."
        );
        onCourseInstructorUpdate?.(
          courseInstructors?.find((ci) => ci.id === id) as CourseInstructorData
        );
        setProcessingPayment(null);
        setIsProcessingPayment(false);
        return;
      }

      // Set payment data to trigger Razorpay component
      setPaymentData({
        ciId: id,
        orderData,
      });
      toast.info("Redirecting to payment gateway...");
    } catch (error: any) {
      console.error("Error initiating payment:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to initiate payment. Please try again."
      );
      setProcessingPayment(null);
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (response: RazorpaySuccessResponse) => {
    if (!paymentData) return;

    try {
      const verifyData: VerifyPaymentDto = {
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      };

      await verifyCITrainingPayment(verifyData);

      toast.success(
        "Payment verified successfully! CI moved to training status."
      );
      onCourseInstructorUpdate?.(
        courseInstructors?.find(
          (ci) => ci.id === paymentData.ciId
        ) as CourseInstructorData
      );

      // Reset state
      setPaymentData(null);
      setProcessingPayment(null);
      setIsProcessingPayment(false);
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      toast.error(
        error.response?.data?.message ||
          "Payment verification failed. Please contact support."
      );
      setPaymentData(null);
      setProcessingPayment(null);
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentFailure = async (error: any) => {
    console.error("Payment failed:", error);
    toast.error(error.error || "Payment failed. Please try again.");

    // Send cancellation to backend if order was created
    if (paymentData?.orderData.orderId) {
      try {
        await verifyCITrainingPayment({
          paymentId: "",
          orderId: paymentData.orderData.orderId,
          signature: "",
        });
      } catch (err) {
        console.error("Error updating payment status:", err);
      }
    }

    setPaymentData(null);
    setProcessingPayment(null);
    setIsProcessingPayment(false);
  };

  const columns: AdminTableColumn<CourseInstructorData>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div className="flex items-center space-x-2">
          <span className="font-medium">{row.name}</span>
          <Badge variant="outline" className="text-xs">
            {row.instructorId}
          </Badge>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      render: (row) => <span>{row.city}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => <span>{row.phone}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge
          variant="outline"
          className={
            row.status === "Payment"
              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
              : ""
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => handlePayment(row.id)}
            disabled={processingPayment === row.id || isProcessingPayment}
            className="bg-green-600 hover:bg-green-700"
          >
            <CreditCard className="h-4 w-4 mr-1" />
            {processingPayment === row.id ? "Processing..." : "Make Payment"}
          </Button>
        </div>
      ),
    },
  ];

  const filters: AdminTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "Payment", label: "Payment" },
      ],
      defaultValue: statusFilter,
    },
  ];

  const sortOptions: AdminTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "dateJoined", label: "Date Joined" },
    { value: "city", label: "City" },
  ];

  return (
    <div className="space-y-4">
      <AdminTable
        data={paginatedData}
        columns={columns}
        getRowId={(courseInstructor) => courseInstructor.id.toString()}
        renderMainCell={(courseInstructor) => (
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">
              {courseInstructor.name}
            </div>
            <div className="text-sm text-gray-500">
              {courseInstructor.instructorId} • {courseInstructor.city}
            </div>
          </div>
        )}
        filters={filters}
        sortOptions={sortOptions}
        defaultSortBy={sortBy}
        defaultSortOrder={sortOrder.toUpperCase() as "ASC" | "DESC"}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy as "name" | "dateJoined" | "city");
          setSortOrder(newSortOrder.toLowerCase() as "asc" | "desc");
        }}
        onSearchChange={setSearchTerm}
        onFilterChange={(key, value) => {
          if (key === "status") {
            setStatusFilter(value as string);
          }
        }}
        currentPage={currentPage}
        pagination={{
          total: filteredData.length,
          totalPages: Math.ceil(filteredData.length / itemsPerPage),
        }}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
      />

      {/* Razorpay Payment Component */}
      {paymentData && user && (
        <RazorpayPayment
          orderId={paymentData.orderData.orderId}
          amount={paymentData.orderData.amount}
          currency={paymentData.orderData.currency}
          franchiseName={user.franchiseName || "Franchise"}
          razorpayKey={paymentData.orderData.key}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          userDetails={{
            name: user.name || "",
            email: user.profile?.mail || "",
            phone: user.profile?.phone || "",
          }}
        />
      )}
    </div>
  );
}
