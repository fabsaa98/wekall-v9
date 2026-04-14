export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 bg-gray-700 rounded w-1/3" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-700 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-700 rounded" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return <div className="animate-pulse h-full bg-gray-700 rounded-xl" />;
}
