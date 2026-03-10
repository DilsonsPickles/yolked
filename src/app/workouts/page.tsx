import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav";
import Link from "next/link";

export default async function WorkoutsPage() {
  const supabase = await createClient();

  const { data: workouts } = await supabase
    .from("workouts")
    .select("*, workout_exercises(count)")
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen pb-20">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="mt-1 text-sm text-zinc-400">Your workout templates</p>
        </div>
        <Link
          href="/workouts/new"
          className="flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New
        </Link>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {workouts && workouts.length > 0 ? (
          <div className="space-y-3">
            {workouts.map((workout) => {
              const exerciseCount =
                workout.workout_exercises?.[0]?.count ?? 0;
              return (
                <div
                  key={workout.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        {workout.name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/workouts/${workout.id}/edit`}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/workouts/${workout.id}/perform`}
                        className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                      >
                        Start
                      </Link>
                    </div>
                  </div>
                  {workout.description && (
                    <p className="mt-2 text-sm text-zinc-400">
                      {workout.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <svg className="h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <div>
              <p className="font-medium text-zinc-400">No workouts yet</p>
              <p className="mt-1 text-sm text-zinc-600">
                Create your first workout template
              </p>
            </div>
            <Link
              href="/workouts/new"
              className="rounded-lg bg-orange-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Create Workout
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
