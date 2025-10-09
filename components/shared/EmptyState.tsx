interface EmptyStateProps {
  message?: string;
  className?: string;
}

export function EmptyState({
  message = "No data found",
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="text-gray-500">{message}</div>
    </div>
  );
}
