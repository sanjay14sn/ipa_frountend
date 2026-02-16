"use client";

import { OrderData } from "@/services/order.service";
import ShippingSection, { shippingDotRef } from "./ShippingSection";
import { useEffect, useState, useRef } from "react";
import { TreeConnector } from "@/components/shared";

interface FranchiseShippingDetailsProps {
  franchiseId: string;
  franchiseName: string;
  orders: OrderData[];
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
  onOrderUpdate: () => void;
}

export default function FranchiseShippingDetails({
  franchiseId,
  franchiseName,
  orders,
  lastRow,
  expandedRows,
  onToggleRow,
  onOrderUpdate,
}: FranchiseShippingDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    const calculateLineHeight = () => {
      if (containerRef.current && shippingDotRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const dotCenter =
          shippingDotRef.current.getBoundingClientRect().top +
          shippingDotRef.current.offsetHeight / 2;
        setLineHeight(dotCenter - containerTop);
      }
    };

    const timeoutId = setTimeout(calculateLineHeight, 10);
    return () => clearTimeout(timeoutId);
  }, [orders, expandedRows]);

  const getTotalAmount = () => {
    return orders.reduce(
      (acc, order) => acc + (parseFloat(order.totalAmount as string) || 0),
      0
    );
  };

  const franchise = orders[0]?.franchise;

  return (
    <div
      className={`bg-gray-50 border-t border-black/20 ${
        lastRow ? "rounded-b-lg" : "border-b border-black/20"
      }`}
    >
      <div className="relative">
        <TreeConnector type="vertical" targetRef={shippingDotRef} containerRef={containerRef} />

        <div className="pl-12 pr-6 py-6 space-y-6" ref={containerRef}>
          <div className="relative">
            <TreeConnector type="horizontal" />
            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h3 className="font-semibold text-lg text-gray-900">{franchiseName}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Franchise Location</span>
                  <p className="text-gray-900 mt-1">{orders[0]?.city || "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Contact</span>
                  <p className="text-gray-900 mt-1">{orders[0]?.phone || "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Orders</span>
                  <p className="text-gray-900 mt-1">{orders.length}</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Amount</span>
                  <p className="text-gray-900 mt-1">₹{getTotalAmount().toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          </div>

          <ShippingSection
            orders={orders}
            franchiseId={franchiseId}
            franchiseName={franchiseName}
            isExpanded={expandedRows.has(`${franchiseId}-orders`)}
            onToggle={onToggleRow}
            onOrderUpdate={onOrderUpdate}
          />
        </div>
      </div>
    </div>
  );
}


