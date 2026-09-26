import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav";
import { ExerciseFilters } from "@/components/exercises/exercise-filters";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import type { Exercise } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{
    q?: string;
    muscle?: string;
    equipment?: string;
    category?: string;
    kind?: string;
    mine?: string;
  }>;
}

export default async function ExercisesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("exercises").select("*").limit(50);

  if (params.q) {
    query = query.ilike("name", `%${params.q}%`);
  }
  if (params.muscle) {
    query = query.contains("primary_muscles", [params.muscle]);
  }
  if (params.equipment) {
    query = query.eq("equipment", params.equipment);
  }
  if (params.category) {
    query = query.eq("category", params.category);
  }
  if (params.kind) {
    query = query.eq("kind", params.kind);
  }
  if (params.mine && user) {
    query = query.eq("owner_id", user.id);
  }

  // Owned exercises first (owner_id non-null sorts before null with nullsFirst: false), then by name
  query = query.order("owner_id", { ascending: true, nullsFirst: false }).order("name");

  const { data: exercises } = await query;

  return (
    <div className="min-h-screen pb-20">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Exercises</h1>
          <p className="mt-1 text-sm text-zinc-400">Browse and search exercises</p>
        </div>
        <Link
          href="/exercises/new"
          className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New
        </Link>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <ExerciseFilters
          currentQuery={params.q}
          currentMuscle={params.muscle}
          currentEquipment={params.equipment}
          currentCategory={params.category}
          currentKind={params.kind}
          currentMine={params.mine === "1"}
        />

        <div className="mt-4 space-y-3">
          {exercises && exercises.length > 0 ? (
            (exercises as Exercise[]).map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
              No exercises found. Try adjusting your filters.
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
