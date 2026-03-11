import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav";
import { HistoryTabs } from "@/components/history/history-tabs";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, completed_at, workout:workouts(name)")
    .eq("user_id", user!.id)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: false });

  // Group sessions by date
  const sessionsByDate: Record<
    string,
    { id: string; workout_name: string; started_at: string; completed_at: string }[]
  > = {};

  if (sessions) {
    for (const session of sessions) {
      const date = new Date(session.started_at).toISOString().split("T")[0];
      if (!sessionsByDate[date]) {
        sessionsByDate[date] = [];
      }
      sessionsByDate[date].push({
        id: session.id,
        workout_name:
          (session.workout as unknown as { name: string })?.name || "Workout",
        started_at: session.started_at,
        completed_at: session.completed_at!,
      });
    }
  }

  // Fetch all completed sets with exercise info for progress graphs
  const { data: completedSets } = await supabase
    .from("session_sets")
    .select(
      "exercise_id, weight_used, reps_completed, exercise:exercises(name), session:workout_sessions(completed_at, user_id)"
    )
    .eq("completed", true)
    .not("weight_used", "is", null)
    .not("reps_completed", "is", null);

  // Filter to current user's sets and flatten
  const progressSets = (completedSets || [])
    .filter((s) => {
      const session = s.session as unknown as { completed_at: string | null; user_id: string } | null;
      return session?.user_id === user!.id && session?.completed_at != null;
    })
    .map((s) => ({
      exercise_id: s.exercise_id,
      exercise_name: (s.exercise as unknown as { name: string })?.name || "Unknown",
      weight_used: s.weight_used,
      reps_completed: s.reps_completed,
      completed_at: (s.session as unknown as { completed_at: string }).completed_at,
    }));

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Your completed workouts
        </p>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <HistoryTabs
          sessionsByDate={sessionsByDate}
          progressSets={progressSets}
        />
      </main>

      <BottomNav />
    </div>
  );
}
