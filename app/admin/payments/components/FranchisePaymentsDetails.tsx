"use client";

import { PaymentData } from "@/services/payment.service";
import PaymentsSection from "./PaymentsSection";
import { useEffect, useState, useRef } from "react";
import { paymentsDotRef } from "./PaymentsSection";
import { TreeConnector } from "@/components/shared";

interface FranchisePaymentsDetailsProps {
  franchiseName: string;
  payments: PaymentData[];
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
}

export default function FranchisePaymentsDetails({
  franchiseName,
  payments,
  lastRow,
  expandedRows,
  onToggleRow,
}: FranchisePaymentsDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    const calculateLineHeight = () => {
      if (containerRef.current && paymentsDotRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const dotCenter =
          paymentsDotRef.current.getBoundingClientRect().top +
          paymentsDotRef.current.offsetHeight / 2;
        setLineHeight(dotCenter - containerTop);
      }
    };

    // Add a small delay to ensure DOM has updated after expansion/collapse
    const timeoutId = setTimeout(calculateLineHeight, 10);

    return () => clearTimeout(timeoutId);
  }, [payments, expandedRows]);

  return (
    <div
      className={`bg-gray-50 border-t border-black/20 ${
        lastRow ? "rounded-b-lg" : "border-b border-black/20"
      }`}
    >
      <div className="relative">
        <TreeConnector
          type="vertical"
          targetRef={paymentsDotRef}
          containerRef={containerRef}
        />

        <div className="pl-12 pr-6 py-6 space-y-6" ref={containerRef}>
          {/* Franchise Details */}
          <div className="relative">
            <TreeConnector type="horizontal" />
            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h3 className="font-semibold text-lg text-gray-900">
                {franchiseName}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Franchisee Name</span>
                  <p className="text-gray-900 mt-1">
                    {payments[0]?.franchisee?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Email</span>
                  <p className="text-gray-900 mt-1">
                    {payments[0]?.franchisee?.mail || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Phone</span>
                  <p className="text-gray-900 mt-1">
                    {payments[0]?.franchisee?.phone || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Total Payments</span>
                  <p className="text-gray-900 mt-1">{payments.length}</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Amount</span>
                  <p className="text-gray-900 mt-1">
                    ₹
                    {payments
                      .reduce((acc, p) => acc + p.amount, 0)
                      .toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Completed Payments</span>
                  <p className="text-gray-900 mt-1">
                    {payments.filter((p) => p.status === "completed").length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Section */}
          <PaymentsSection
            payments={payments}
            franchiseName={franchiseName}
            isExpanded={expandedRows.has(`${franchiseName}-payments`)}
            onToggle={onToggleRow}
          />
        </div>
      </div>
    </div>
  );
}
