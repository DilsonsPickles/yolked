import { BottomNav } from "@/components/nav";

export default function EditWorkoutLoading() {
  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <div className="h-8 w-36 animate-pulse rounded bg-zinc-800" />
      </header>
      <main className="mx-auto max-w-lg space-y-4 p-4">
        {/* Name input skeleton */}
        <div className="h-12 animate-pulse rounded-xl bg-zinc-800" />
        {/* Description skeleton */}
        <div className="h-20 animate-pulse rounded-xl bg-zinc-800" />
        {/* Exercise list skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-zinc-800"
          />
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
