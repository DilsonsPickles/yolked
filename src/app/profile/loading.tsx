import { BottomNav } from "@/components/nav";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <div className="h-8 w-24 animate-pulse rounded bg-zinc-800" />
      </header>
      <main className="mx-auto max-w-lg space-y-6 p-4">
        {/* Profile info skeleton */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-5 w-56 animate-pulse rounded bg-zinc-800" />
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
        </div>
        {/* Buttons skeleton */}
        <div className="h-12 animate-pulse rounded-xl bg-zinc-800" />
      </main>
      <BottomNav />
    </div>
  );
}
