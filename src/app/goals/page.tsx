import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav";
import { GoalsClient, type GoalCard, type BaseOption } from "./goals-client";
import type { Goal, GoalRung } from "@/lib/types/database";

type GoalWithRungs = Goal & {
  rungs: (GoalRung & { exercise: { name: string } | null })[];
  benchmark: { name: string } | null;
};

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: goals }, { data: baseWorkouts }] = await Promise.all([
    supabase
      .from("goals")
      .select(
        "*, rungs:goal_rungs(*, exercise:exercises(name)), benchmark:exercises!benchmark_exercise_id(name)"
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("workouts")
      .select("id, name, blocks:workout_blocks(id)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const typed = ((goals as GoalWithRungs[]) || []).map((g) => ({
    ...g,
    rungs: [...g.rungs].sort((a, b) => a.sort_order - b.sort_order),
  }));

  // Best benchmark hold per exercise, from the user's completed sets
  const benchmarkIds = typed
    .map((g) => g.benchmark_exercise_id)
    .filter((id): id is string => Boolean(id));
  const bestByExercise = new Map<string, number>();
  if (benchmarkIds.length > 0) {
    const { data: sets } = await supabase
      .from("session_sets")
      .select("exercise_id, seconds_completed, session:workout_sessions!inner(user_id, completed_at, deleted_at)")
      .in("exercise_id", benchmarkIds)
      .eq("completed", true)
      .not("seconds_completed", "is", null)
      .eq("session.user_id", user.id)
      .is("session.deleted_at", null)
      .not("session.completed_at", "is", null);
    for (const s of sets || []) {
      const current = bestByExercise.get(s.exercise_id) ?? 0;
      if ((s.seconds_completed ?? 0) > current) bestByExercise.set(s.exercise_id, s.seconds_completed!);
    }
  }

  const cards: GoalCard[] = typed.map((g) => {
    const active = g.rungs.find((r) => r.status === "form" || r.status === "building");
    return {
      id: g.id,
      name: g.name,
      kind: g.kind,
      pass_condition: g.pass_condition,
      achieved: Boolean(g.achieved_at),
      rungCount: g.rungs.length,
      completedRungs: g.rungs.filter((r) => r.status === "maintaining").length,
      activeRung: active
        ? { name: active.exercise?.name ?? active.exercise_id, status: active.status }
        : null,
      benchmark: g.benchmark_exercise_id
        ? {
            name: g.benchmark?.name ?? g.benchmark_exercise_id,
            target_seconds: g.benchmark_target_seconds,
            best_seconds: bestByExercise.get(g.benchmark_exercise_id) ?? null,
          }
        : null,
    };
  });

  const bases: BaseOption[] = ((baseWorkouts as { id: string; name: string; blocks: { id: string }[] }[]) || [])
    .filter((w) => w.blocks.length > 0)
    .map((w) => ({ id: w.id, name: w.name }));

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ladders to climb, benchmarks to hit. Each rung goes form → building → maintaining.
        </p>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <GoalsClient goals={cards} bases={bases} />
      </main>

      <BottomNav />
    </div>
  );
}
