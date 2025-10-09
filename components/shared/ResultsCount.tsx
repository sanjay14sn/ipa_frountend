interface ResultsCountProps {
  loading: boolean;
  count: number;
  total: number;
  itemName?: string;
  className?: string;
}

export function ResultsCount({
  loading,
  count,
  total,
  itemName = "items",
  className = "",
}: ResultsCountProps) {
  return (
    <div className={`text-sm text-gray-600 ${className}`}>
      {loading ? "Loading..." : `Showing ${count} of ${total} ${itemName}`}
    </div>
  );
}
