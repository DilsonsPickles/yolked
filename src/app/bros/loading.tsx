import { BottomNav } from "@/components/nav";

export default function BrosLoading() {
  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <div className="h-8 w-24 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-zinc-800" />
      </header>
      <main className="mx-auto max-w-lg space-y-6 p-4">
        <div className="h-28 animate-pulse rounded-xl bg-zinc-800" />
        <div className="h-24 animate-pulse rounded-xl bg-zinc-800" />
        <div className="h-20 animate-pulse rounded-xl bg-zinc-800" />
      </main>
      <BottomNav />
    </div>
  );
}
