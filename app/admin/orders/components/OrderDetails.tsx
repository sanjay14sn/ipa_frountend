"use client";

import { useEffect, useState, useRef } from "react";
import { OrderData, getOrderByIdAdmin } from "@/services/order.service";
import { Loader2 } from "lucide-react";
import StudentOrderSection, { studentOrderDotRef } from "./StudentOrderSection";

interface OrderDetailsProps {
  order: OrderData;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
}

export default function OrderDetails({
  order,
  lastRow,
  expandedRows,
  onToggleRow,
}: OrderDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  const [detailedOrder, setDetailedOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch detailed order data when component mounts
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const data = await getOrderByIdAdmin(order.id);
        setDetailedOrder(data);
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [order.id]);

  useEffect(() => {
    const calculateLineHeight = () => {
      if (containerRef.current && detailedOrder?.orderItems) {
        const containerTop = containerRef.current.getBoundingClientRect().top;

        // Get the last student section's dot as reference
        const studentKeys = Object.keys(detailedOrder.orderItems);
        if (studentKeys.length > 0 && studentOrderDotRef.current) {
          const dotCenter =
            studentOrderDotRef.current.getBoundingClientRect().top +
            studentOrderDotRef.current.offsetHeight / 2;
          setLineHeight(dotCenter - containerTop);
        } else {
          // Fallback
          const firstSection = containerRef.current.querySelector(".relative");
          if (firstSection) {
            const sectionTop = firstSection.getBoundingClientRect().top;
            setLineHeight(sectionTop - containerTop + 20);
          }
        }
      }
    };

    const timeoutId = setTimeout(calculateLineHeight, 10);
    return () => clearTimeout(timeoutId);
  }, [detailedOrder, expandedRows]);

  if (loading) {
    return (
      <div
        className={`bg-gray-50 border-t border-black/20 ${
          lastRow ? "rounded-b-lg" : "border-b border-black/20"
        }`}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
          <p className="text-sm text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!detailedOrder || !detailedOrder.orderItems) {
    return (
      <div
        className={`bg-gray-50 border-t border-black/20 ${
          lastRow ? "rounded-b-lg" : "border-b border-black/20"
        }`}
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">No order details available</p>
        </div>
      </div>
    );
  }

  const studentKeys = Object.keys(detailedOrder.orderItems);

  return (
    <div
      className={`bg-gray-50 border-t border-black/20 ${
        lastRow ? "rounded-b-lg" : "border-b border-black/20"
      }`}
    >
      <div className="relative">
        {/* Vertical connecting line from main row */}
        <div
          className="absolute left-6 border-primary border bg-primary"
          style={{ top: 0, height: `${lineHeight - 6}px` }}
        ></div>

        <div className="pl-12 pr-6 py-6 space-y-6" ref={containerRef}>
          {/* Order Summary */}
          <div className="relative">
            {/* Curved horizontal connecting line with dot */}
            <div className="absolute -left-6 top-4 w-6 h-4">
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>
            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h3 className="font-semibold text-lg text-gray-900">
                Order #{detailedOrder.id}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Order Date</span>
                  <p className="text-gray-900 mt-1">
                    {new Date(detailedOrder.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="text-gray-900 mt-1">{detailedOrder.status}</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Amount</span>
                  <p className="text-gray-900 mt-1 font-semibold">
                    ₹{detailedOrder.totalAmount}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Students</span>
                  <p className="text-gray-900 mt-1">{studentKeys.length}</p>
                </div>
                {detailedOrder.referenceId && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Payment Reference ID</span>
                    <p className="text-gray-900 mt-1 font-mono text-xs break-all">
                      {detailedOrder.referenceId}
                    </p>
                  </div>
                )}
              </div>
              {detailedOrder.notes && (
                <div className="pt-2 border-t">
                  <span className="text-gray-500 text-sm">Notes</span>
                  <p className="text-gray-900 mt-1 text-sm">
                    {detailedOrder.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Student Order Sections */}
          {studentKeys.map((studentKey, index) => (
            <StudentOrderSection
              key={studentKey}
              studentKey={studentKey}
              items={detailedOrder.orderItems![studentKey]}
              orderId={order.id.toString()}
              isExpanded={expandedRows.has(`${order.id}-${studentKey}`)}
              onToggle={onToggleRow}
              isLast={index === studentKeys.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


