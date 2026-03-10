import { BottomNav } from "@/components/nav";

export default function WorkoutsLoading() {
  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <div className="h-8 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-zinc-800" />
      </header>
      <main className="mx-auto max-w-lg p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-zinc-800"
          />
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
