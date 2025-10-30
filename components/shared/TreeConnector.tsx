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
          const dotCenter =
            targetRef.current.getBoundingClientRect().top +
            targetRef.current.offsetHeight / 2;
          setLineHeight(dotCenter - containerTop);
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
      style={{ top: 0, height: `${lineHeight - 6}px` }}
    />
  );
}

export function useTreeConnector() {
  return useRef<HTMLDivElement>(null);
}
