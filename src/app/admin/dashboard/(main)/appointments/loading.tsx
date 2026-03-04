export default function AppointmentsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Tabs + actions skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-9 w-64 rounded-md bg-surface-secondary" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded bg-surface-secondary" />
          <div className="h-8 w-20 rounded bg-surface-secondary" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-border-primary bg-surface-primary">
        {/* Header row */}
        <div className="flex gap-4 border-b border-border-primary p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-24 rounded bg-surface-secondary" />
          ))}
        </div>
        {/* Body rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-border-primary p-3 last:border-0"
          >
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 w-24 rounded bg-surface-secondary" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
