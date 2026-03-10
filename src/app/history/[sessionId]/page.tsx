import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav";
import { DeleteSessionButton } from "@/components/history/delete-session-button";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { SessionSet, Exercise } from "@/lib/types/database";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*, workout:workouts(name)")
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  const { data: sets } = await supabase
    .from("session_sets")
    .select("*, exercise:exercises(name, primary_muscles, equipment)")
    .eq("session_id", sessionId)
    .order("exercise_id")
    .order("set_number");

  const started = new Date(session.started_at);
  const completed = session.completed_at
    ? new Date(session.completed_at)
    : null;

  const durationMin = completed
    ? Math.round((completed.getTime() - started.getTime()) / 60000)
    : null;

  // Group sets by exercise
  const exerciseGroups: {
    exercise: { name: string; primary_muscles: string[]; equipment: string | null };
    sets: SessionSet[];
  }[] = [];

  let currentExerciseId: string | null = null;

  for (const set of (sets || []) as (SessionSet & { exercise: Exercise })[]) {
    if (set.exercise_id !== currentExerciseId) {
      exerciseGroups.push({
        exercise: set.exercise,
        sets: [],
      });
      currentExerciseId = set.exercise_id;
    }
    exerciseGroups[exerciseGroups.length - 1].sets.push(set);
  }

  const totalVolume = (sets || []).reduce((sum, s) => {
    const set = s as SessionSet;
    if (set.completed && set.weight_used && set.reps_completed) {
      return sum + set.weight_used * set.reps_completed;
    }
    return sum;
  }, 0);

  const completedCount = (sets || []).filter(
    (s) => (s as SessionSet).completed
  ).length;

  const workoutName =
    (session.workout as unknown as { name: string })?.name || "Workout";

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-4">
        <Link
          href="/history"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          History
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{workoutName}</h1>
          <DeleteSessionButton sessionId={sessionId} />
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {started.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </header>

      <main className="mx-auto max-w-lg space-y-6 p-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500">Duration</p>
            <p className="mt-1 text-lg font-bold">
              {durationMin != null ? `${durationMin}m` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500">Sets</p>
            <p className="mt-1 text-lg font-bold">
              {completedCount}/{(sets || []).length}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500">Volume</p>
            <p className="mt-1 text-lg font-bold">
              {totalVolume > 0 ? `${totalVolume.toLocaleString()} kg` : "—"}
            </p>
          </div>
        </div>

        {/* Exercise details */}
        {exerciseGroups.map((group, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900"
          >
            <div className="border-b border-zinc-800 p-4">
              <h3 className="font-semibold">{group.exercise.name}</h3>
              <p className="text-xs text-zinc-500">
                {group.exercise.primary_muscles.join(", ")}
              </p>
            </div>
            <div className="p-4">
              <div className="mb-2 grid grid-cols-[2rem_1fr_1fr_2rem] text-xs text-zinc-500">
                <span className="text-center">Set</span>
                <span className="text-center">Weight</span>
                <span className="text-center">Reps</span>
                <span />
              </div>
              {group.sets.map((set) => (
                <div
                  key={set.id}
                  className={`grid grid-cols-[2rem_1fr_1fr_2rem] items-center rounded py-1.5 text-sm ${
                    set.completed ? "text-white" : "text-zinc-600"
                  }`}
                >
                  <span className="text-center text-zinc-500">
                    {set.set_number}
                  </span>
                  <span className="text-center">
                    {set.weight_used != null ? `${set.weight_used}` : "—"}
                  </span>
                  <span className="text-center">
                    {set.reps_completed != null ? set.reps_completed : "—"}
                  </span>
                  <span className="text-center">
                    {set.completed ? (
                      <svg className="mx-auto h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="mx-auto h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Session notes */}
        {session.notes && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-400">Notes</h3>
            <p className="text-sm text-zinc-300">{session.notes}</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
