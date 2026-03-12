export default function PerformWorkoutLoading() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-5 w-16 animate-pulse rounded bg-zinc-800" />
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-4 p-4">
        {/* Rest timer skeleton */}
        <div className="h-14 animate-pulse rounded-xl bg-zinc-800" />
        {/* Exercise cards skeleton */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 p-4">
              <div className="h-5 w-36 animate-pulse rounded bg-zinc-800" />
            </div>
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="h-10 animate-pulse rounded bg-zinc-800"
                />
              ))}
            </div>
          </div>
        ))}
        {/* Finish button skeleton */}
        <div className="h-14 animate-pulse rounded-xl bg-zinc-800" />
      </main>
    </div>
  );
}
