import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Exercise } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ExerciseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single();

  if (!exercise) {
    notFound();
  }

  const ex = exercise as Exercise;

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-4">
        <Link
          href="/exercises"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
        <h1 className="text-2xl font-bold">{ex.name}</h1>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-6">
        {/* Images */}
        {ex.images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto">
            {ex.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`${ex.name} step ${i + 1}`}
                className="h-48 w-48 shrink-0 rounded-xl bg-zinc-800 object-cover"
              />
            ))}
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">Category</p>
            <p className="mt-1 font-medium capitalize">{ex.category}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">Level</p>
            <p className="mt-1 font-medium capitalize">{ex.level}</p>
          </div>
          {ex.equipment && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500">Equipment</p>
              <p className="mt-1 font-medium capitalize">{ex.equipment}</p>
            </div>
          )}
          {ex.mechanic && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500">Mechanic</p>
              <p className="mt-1 font-medium capitalize">{ex.mechanic}</p>
            </div>
          )}
          {ex.force && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500">Force</p>
              <p className="mt-1 font-medium capitalize">{ex.force}</p>
            </div>
          )}
        </div>

        {/* Muscles */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">
            Target Muscles
          </h2>
          <div className="flex flex-wrap gap-2">
            {ex.primary_muscles.map((m) => (
              <span
                key={m}
                className="rounded-lg bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-400"
              >
                {m}
              </span>
            ))}
            {ex.secondary_muscles.map((m) => (
              <span
                key={m}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Instructions */}
        {ex.instructions.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-400">
              Instructions
            </h2>
            <ol className="space-y-3">
              {ex.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-orange-500">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
