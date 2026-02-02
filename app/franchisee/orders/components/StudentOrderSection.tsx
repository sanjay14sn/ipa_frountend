import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { OrderItemData } from "@/services/order.service";
import React, { useEffect, useState, useRef } from "react";

interface StudentOrderSectionProps {
  studentKey: string;
  items: OrderItemData[];
  orderId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  isLast: boolean;
  isCIOrder?: boolean;
}

export const studentOrderDotRef = React.createRef<HTMLDivElement>();
export const studentOrderInternalDotRef = React.createRef<HTMLDivElement>();

export default function StudentOrderSection({
  studentKey,
  items,
  orderId,
  isExpanded,
  onToggle,
  isLast,
  isCIOrder = false,
}: StudentOrderSectionProps) {
  const sectionId = `${orderId}-${studentKey}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    if (
      containerRef.current &&
      studentOrderInternalDotRef.current &&
      isExpanded
    ) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        studentOrderInternalDotRef.current.getBoundingClientRect().top +
        studentOrderInternalDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [isExpanded, items]);

  return (
    <div className="relative">
      <div
        ref={isLast ? studentOrderDotRef : null}
        className="absolute -left-6 top-1 w-6 h-4"
      >
        <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
        <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
      </div>
      <div className="bg-white rounded-lg border border-primary">
        <div className="p-2 flex items-center gap-2">
          <button
            onClick={() => onToggle(sectionId)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <h4 className="font-medium text-gray-900">{studentKey}</h4>
          {isCIOrder && (
            <Badge variant="secondary" className="ml-2">
              CI Order
            </Badge>
          )}
          <Badge variant="outline" className="ml-2">
            {items.length} {items.length === 1 ? "item" : "items"}
          </Badge>
        </div>

        {isExpanded && (
          <div className="relative border-t border-black" ref={containerRef}>
            <div
              className="absolute left-6 border-primary border bg-primary"
              style={{ top: 0, height: `${lineHeight - 6}px` }}
            ></div>
            <div className="pl-12 pr-4 py-4">
              <div className="relative">
                <div
                  ref={studentOrderInternalDotRef}
                  className="absolute -left-6 top-4 w-6 h-4"
                >
                  <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                  <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-primary">
                  <h5 className="font-semibold text-gray-900 mb-3">
                    Ordered Materials
                  </h5>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {item.inventory.name}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                              <div>
                                <span className="text-gray-500">Quantity:</span>{" "}
                                <span className="font-medium">
                                  {item.quantity}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
