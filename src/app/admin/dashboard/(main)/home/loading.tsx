export default function HomeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border-primary bg-surface-primary p-4 shadow-sm"
          >
            <div className="h-4 w-24 rounded bg-surface-secondary" />
            <div className="mt-2 h-7 w-12 rounded bg-surface-secondary" />
          </div>
        ))}
      </div>

      {/* Section title skeleton */}
      <div className="h-5 w-48 rounded bg-surface-secondary" />

      {/* Appointment cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border-primary bg-surface-primary p-4 shadow-sm"
          >
            <div className="h-4 w-32 rounded bg-surface-secondary" />
            <div className="mt-2 h-3 w-48 rounded bg-surface-secondary" />
            <div className="mt-3 h-3 w-24 rounded bg-surface-secondary" />
            <div className="mt-4 h-8 w-20 rounded bg-surface-secondary" />
          </div>
        ))}
      </div>
    </div>
  );
}
