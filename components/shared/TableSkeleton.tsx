import { TableRow, TableCell } from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <div
                className={`h-${colIndex === 0 ? "12" : "8"} bg-gray-200 animate-pulse rounded`}
              ></div>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
