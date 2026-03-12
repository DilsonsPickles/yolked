import { BottomNav } from "@/components/nav";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <div className="h-8 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-zinc-800" />
      </header>
      <main className="mx-auto max-w-lg space-y-6 p-4">
        {/* Quick actions skeleton */}
        <section>
          <div className="mb-3 h-5 w-28 animate-pulse rounded bg-zinc-800" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-zinc-800"
              />
            ))}
          </div>
        </section>
        {/* This week skeleton */}
        <section>
          <div className="mb-3 h-5 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="h-20 animate-pulse rounded-xl bg-zinc-800" />
        </section>
        {/* Activity feed skeleton */}
        <section>
          <div className="mb-3 h-5 w-20 animate-pulse rounded bg-zinc-800" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-zinc-800"
              />
            ))}
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
