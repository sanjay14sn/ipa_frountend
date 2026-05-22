"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Award, Target, Phone, MapPin } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
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
import { MultiLevelTrainingPaymentModal } from "./MultiLevelTrainingPaymentModal";
import { GraduationHistoryModal } from "./GraduationHistoryModal";
import { TrainingProgressModal } from "./TrainingProgressModal";
import { abandonOrderPayment } from "@/services/order.service";
import { getUserFriendlyMessage } from "@/lib/error-utils";

interface PaymentCourseInstructorsTableProps {
  courseInstructors?: CourseInstructorData[];
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
  ) => void;
  onCourseInstructorDelete?: (courseInstructorId: string) => void;
  onCourseInstructorEdit?: (courseInstructor: CourseInstructorData) => void;
}

export default function PaymentCourseInstructorsTable({
  courseInstructors,
  onCourseInstructorUpdate,
  onCourseInstructorDelete: _onCourseInstructorDelete,
  onCourseInstructorEdit: _onCourseInstructorEdit,
}: PaymentCourseInstructorsTableProps) {
  void _onCourseInstructorDelete;
  void _onCourseInstructorEdit;
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
  const [multiLevelModalOpen, setMultiLevelModalOpen] = useState(false);
  const [graduationModalOpen, setGraduationModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] =
    useState<CourseInstructorData | null>(null);
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
        getUserFriendlyMessage(error, "Failed to initiate payment. Please try again."),
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
        getUserFriendlyMessage(
          error,
          "Payment verification failed. Please contact support.",
        ),
      );
      setPaymentData(null);
      setProcessingPayment(null);
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentFailure = async (error: any) => {
    console.error("Payment failed:", error);
    toast.error(getUserFriendlyMessage(error, "Payment failed. Please try again."));

    setPaymentData(null);
    setProcessingPayment(null);
    setIsProcessingPayment(false);
  };

  const columns: DataTableColumn<CourseInstructorData>[] = [
    {
      key: "name",
      header: "Instructor Details",
      className: "w-[280px]",
      render: (row) => (
        <div className="flex flex-col space-y-2 py-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base text-gray-900">
              {row.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {row.instructorId}
            </Badge>
            <span className="text-xs text-gray-500">ID</span>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact Information",
      className: "w-[220px]",
      render: (row) => (
        <div className="flex flex-col space-y-1.5 py-1">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-700">{row.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-600">{row.city}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Payment Status",
      className: "w-[160px] text-center",
      render: (row) => (
        <div className="flex justify-center py-1">
          <StatusBadge tone="warning" label={row.status} />
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[380px]",
      render: (row) => (
        <div className="flex items-center gap-2.5 py-1">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setSelectedInstructor(row);
              setMultiLevelModalOpen(true);
            }}
            disabled={isProcessingPayment}
            className="bg-primary hover:bg-primary/90 font-medium h-9 px-4"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Pay for Training
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedInstructor(row);
              setProgressModalOpen(true);
            }}
            className="h-9 px-4"
          >
            <Target className="h-4 w-4 mr-2" />
            View Progress
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedInstructor(row);
              setGraduationModalOpen(true);
            }}
            className="h-9 px-3"
            title="View Graduation History"
            aria-label={`View graduation history for ${row.name}`}
          >
            <Award className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
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

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "dateJoined", label: "Date Joined" },
    { value: "city", label: "City" },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        data={paginatedData}
        columns={columns}
        getRowId={(courseInstructor) => courseInstructor.id.toString()}
        renderMainCell={(courseInstructor) => (
          <div className="flex items-center justify-between w-full pr-6 py-2">
            <div className="flex flex-col space-y-1.5">
              <div className="font-semibold text-gray-900 text-lg">
                {courseInstructor.name}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Badge variant="outline" className="font-mono text-xs">
                    {courseInstructor.instructorId}
                  </Badge>
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {courseInstructor.city}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {courseInstructor.phone}
                </span>
              </div>
            </div>
            <StatusBadge tone="warning" label="Payment Pending" />
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
          onAbandon={async ({ orderId, reason }) => {
            await abandonOrderPayment({
              razorpayOrderId: orderId,
              note: reason,
            });
          }}
          userDetails={{
            name: user.name || "",
            email: user.profile?.mail || "",
            phone: user.profile?.phone || "",
          }}
        />
      )}

      {/* Multi-Level Training Payment Modal */}
      {selectedInstructor && (
        <>
          <MultiLevelTrainingPaymentModal
            isOpen={multiLevelModalOpen}
            onClose={() => {
              setMultiLevelModalOpen(false);
              setSelectedInstructor(null);
            }}
            instructorId={selectedInstructor.id}
            instructorName={selectedInstructor.name}
            onPaymentSuccess={() => {
              onCourseInstructorUpdate?.(selectedInstructor);
            }}
          />
          <GraduationHistoryModal
            isOpen={graduationModalOpen}
            onClose={() => {
              setGraduationModalOpen(false);
              setSelectedInstructor(null);
            }}
            instructorId={selectedInstructor.id}
            instructorName={selectedInstructor.name}
          />
          <TrainingProgressModal
            isOpen={progressModalOpen}
            onClose={() => {
              setProgressModalOpen(false);
              setSelectedInstructor(null);
            }}
            instructorId={selectedInstructor.id}
            instructorName={selectedInstructor.name}
          />
        </>
      )}
    </div>
  );
}
