import { useEffect, useState, useRef } from "react";

interface TreeConnectorProps {
  type: "horizontal" | "vertical";
  targetRef?: React.RefObject<any>;
  containerRef?: React.RefObject<any>;
}

export function TreeConnector({
  type,
  targetRef,
  containerRef,
}: TreeConnectorProps) {
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    if (type === "vertical" && targetRef && containerRef) {
      const calculateLineHeight = () => {
        if (containerRef.current && targetRef.current) {
          const containerTop = containerRef.current.getBoundingClientRect().top;
          // The targetRef points to the div containing the horizontal connector
          // The horizontal connector div is positioned at top-4 (16px) from its parent
          // The L-shaped border starts at top-0 of the horizontal connector div
          // So the connection point is at: targetRef top + 16px (top-4)
          const targetTop = targetRef.current.getBoundingClientRect().top;
          // The dot is at top-4 (16px) within the horizontal connector, centered with translate
          // Dot center is at: targetTop + 16px + 1px (half dot) - 1px (translate) = targetTop + 16px
          const connectionPoint = targetTop + 16;
          setLineHeight(connectionPoint - containerTop);
        }
      };

      const timeoutId = setTimeout(calculateLineHeight, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [type, targetRef, containerRef]);

  if (type === "horizontal") {
    return (
      <div className="absolute -left-6 top-4 w-6 h-4">
        <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
        <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
      </div>
    );
  }

  return (
    <div
      className="absolute left-6 border-primary border bg-primary"
      style={{ top: 0, height: `${lineHeight}px` }}
    />
  );
}

export function useTreeConnector() {
  return useRef<HTMLDivElement>(null);
}
