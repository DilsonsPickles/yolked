import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav";
import Link from "next/link";
import { WorkoutsClient } from "./workouts-client";

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workouts } = await supabase
    .from("workouts")
    .select(
      "*, workout_exercises(*, exercise:exercises(name)), owner:profiles!user_id(display_name)"
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .order("sort_order", {
      referencedTable: "workout_exercises",
      ascending: true,
    });

  const myWorkouts =
    workouts?.filter((w) => w.user_id === user?.id) || [];
  const sharedWorkouts =
    workouts?.filter((w) => w.user_id !== user?.id) || [];

  return (
    <div className="min-h-screen pb-20">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="mt-1 text-sm text-zinc-400">Your workout templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/exercises"
            className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            Library
          </Link>
          <Link
            href="/workouts/new"
            className="flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <WorkoutsClient
          myWorkouts={myWorkouts}
          sharedWorkouts={sharedWorkouts}
        />
      </main>

      <BottomNav />
    </div>
  );
}
