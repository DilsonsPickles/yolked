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
  }>;
}

export default async function ExercisesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("exercises")
    .select("*")
    .order("name")
    .limit(50);

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

  const { data: exercises } = await query;

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Browse and search exercises
        </p>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <ExerciseFilters
          currentQuery={params.q}
          currentMuscle={params.muscle}
          currentEquipment={params.equipment}
          currentCategory={params.category}
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
