import { BottomNav } from "@/components/nav";

export default function SessionDetailLoading() {
  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mb-2 h-4 w-16 animate-pulse rounded bg-zinc-800" />
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-40 animate-pulse rounded bg-zinc-800" />
      </header>
      <main className="mx-auto max-w-lg space-y-6 p-4">
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-zinc-800"
            />
          ))}
        </div>
        {/* Exercise groups skeleton */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl bg-zinc-800"
          />
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
