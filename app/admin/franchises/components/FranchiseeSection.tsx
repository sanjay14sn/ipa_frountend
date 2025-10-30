import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { FranchiseeResponse } from "@/services/franchisee.service";
import React, { useEffect, useState, useRef } from "react";

interface FranchiseeSectionProps {
  franchisee: FranchiseeResponse;
  clientId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export const franchiseeDotRef = React.createRef<HTMLDivElement>();
export const franchiseeInternalDotRef = React.createRef<HTMLDivElement>();
export default function FranchiseeSection({
  franchisee,
  clientId,
  isExpanded,
  onToggle,
}: FranchiseeSectionProps) {
  const sectionId = `${clientId}-franchisee`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    if (
      containerRef.current &&
      franchiseeInternalDotRef.current &&
      isExpanded
    ) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        franchiseeInternalDotRef.current.getBoundingClientRect().top +
        franchiseeInternalDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [isExpanded, franchisee]);

  return (
    <div className="relative">
      <div ref={franchiseeDotRef} className="absolute -left-6 top-1 w-6 h-4 ">
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
          <h4 className="font-medium text-gray-900">Franchisee</h4>
          <Badge variant="outline" className="ml-2">
            1
          </Badge>
        </div>

        {isExpanded && (
          <div className="relative border-t border-primary" ref={containerRef}>
            <div
              className="absolute left-6 border-primary border bg-primary"
              style={{ top: 0, height: `${lineHeight - 6}px` }}
            ></div>
            <div className="pl-12 pr-4 py-4">
              <div className="relative">
                <div
                  ref={franchiseeInternalDotRef}
                  className="absolute -left-6 top-4 w-6 h-4 "
                >
                  <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                  <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-primary">
                  <h5 className="font-semibold text-gray-900">
                    {franchisee.name}
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Email</span>
                      <p className="text-gray-900 mt-1">{franchisee.mail}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone</span>
                      <p className="text-gray-900 mt-1">{franchisee.phone}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">City</span>
                      <p className="text-gray-900 mt-1">{franchisee.city}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Present Occupation</span>
                      <p className="text-gray-900 mt-1">
                        {franchisee.occupation}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">
                        Communication Address
                      </span>
                      <p className="text-gray-900 mt-1">
                        {franchisee.communicationAddress}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Reference</span>
                      <p className="text-gray-900 mt-1">
                        {franchisee.reference}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Personal Details
                    </h6>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Date of Birth</span>
                        <p className="text-gray-900 mt-1">
                          {new Date(franchisee.dob).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Blood Group</span>
                        <p className="text-gray-900 mt-1">
                          {franchisee.bloodGroup}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">
                          Educational Qualification
                        </span>
                        <p className="text-gray-900 mt-1">
                          {franchisee.education}
                        </p>
                      </div>
                    </div>
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
