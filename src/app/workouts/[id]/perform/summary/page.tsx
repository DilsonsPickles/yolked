import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkoutSummary } from "@/components/workouts/workout-summary";
import type { SessionSet } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
}

export default async function SummaryPage({ params, searchParams }: Props) {
  const { id: workoutId } = await params;
  const { session: sessionId } = await searchParams;

  if (!sessionId) redirect("/workouts");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Fetch the completed session
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*, workout:workouts(name)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session || !session.completed_at) redirect("/workouts");

  const workoutName =
    (session.workout as unknown as { name: string })?.name || "Workout";

  // 2. Fetch all sets for this session with exercise names
  const { data: sets } = await supabase
    .from("session_sets")
    .select("*, exercise:exercises(name)")
    .eq("session_id", sessionId)
    .order("exercise_id")
    .order("set_number");

  const typedSets = (sets || []) as (SessionSet & {
    exercise: { name: string };
  })[];

  // 3. Calculate duration
  const started = new Date(session.started_at);
  const completed = new Date(session.completed_at);
  const durationMinutes = Math.round(
    (completed.getTime() - started.getTime()) / 60000
  );

  // 4. Calculate total volume and completed sets
  let totalVolume = 0;
  let completedSets = 0;
  const totalSets = typedSets.length;

  for (const set of typedSets) {
    if (set.completed) {
      completedSets++;
      if (set.weight_used && set.reps_completed) {
        totalVolume += set.weight_used * set.reps_completed;
      }
    }
  }

  // 5. Group by exercise for breakdown and PR detection
  const exerciseMap = new Map<
    string,
    {
      name: string;
      exerciseId: string;
      completedSets: number;
      topWeight: number | null;
      topReps: number | null;
    }
  >();

  for (const set of typedSets) {
    if (!set.completed) continue;
    const existing = exerciseMap.get(set.exercise_id);
    if (!existing) {
      exerciseMap.set(set.exercise_id, {
        name: set.exercise.name,
        exerciseId: set.exercise_id,
        completedSets: 1,
        topWeight: set.weight_used,
        topReps: set.reps_completed,
      });
    } else {
      existing.completedSets++;
      if (
        set.weight_used !== null &&
        (existing.topWeight === null || set.weight_used > existing.topWeight)
      ) {
        existing.topWeight = set.weight_used;
        existing.topReps = set.reps_completed;
      }
    }
  }

  // 6. PR detection — compare max weight per exercise vs all previous sessions
  const exerciseIds = Array.from(exerciseMap.keys());

  // Get all previous completed sets for these exercises by this user
  const { data: allPreviousSets } = await supabase
    .from("session_sets")
    .select("exercise_id, weight_used")
    .in("exercise_id", exerciseIds)
    .neq("session_id", sessionId)
    .eq("completed", true)
    .not("weight_used", "is", null)
    .in(
      "session_id",
      // Subquery: only sessions by this user that are completed and not deleted
      (
        await supabase
          .from("workout_sessions")
          .select("id")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .not("completed_at", "is", null)
      ).data?.map((s) => s.id) || []
    );

  // Build max weight map from previous sessions
  const previousMaxWeight = new Map<string, number>();
  for (const ps of allPreviousSets || []) {
    const current = previousMaxWeight.get(ps.exercise_id) || 0;
    if (ps.weight_used && ps.weight_used > current) {
      previousMaxWeight.set(ps.exercise_id, ps.weight_used);
    }
  }

  // 7. Volume comparison — find most recent previous session of same workout
  let volumeChange: number | null = null;

  if (session.workout_id) {
    const { data: prevSession } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("workout_id", session.workout_id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .not("completed_at", "is", null)
      .neq("id", sessionId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (prevSession) {
      const { data: prevSets } = await supabase
        .from("session_sets")
        .select("weight_used, reps_completed, completed")
        .eq("session_id", prevSession.id);

      const prevVolume = (prevSets || []).reduce((sum, s) => {
        if (s.completed && s.weight_used && s.reps_completed) {
          return sum + s.weight_used * s.reps_completed;
        }
        return sum;
      }, 0);

      if (prevVolume > 0 && totalVolume > 0) {
        volumeChange = ((totalVolume - prevVolume) / prevVolume) * 100;
      }
    }
  }

  // 8. Weekly streak — count completed sessions this week (Sun–Sat)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { count: weekCount } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .not("completed_at", "is", null)
    .gte("completed_at", weekStart.toISOString());

  // 9. Build exercise summaries
  const exercises = Array.from(exerciseMap.values()).map((ex) => {
    const prevMax = previousMaxWeight.get(ex.exerciseId) || 0;
    const isPR =
      ex.topWeight !== null && ex.topWeight > 0 && ex.topWeight > prevMax;

    return {
      name: ex.name,
      sets: ex.completedSets,
      topWeight: ex.topWeight,
      topReps: ex.topReps,
      isPR,
    };
  });

  return (
    <WorkoutSummary
      workoutName={workoutName}
      durationMinutes={durationMinutes}
      totalVolume={totalVolume}
      completedSets={completedSets}
      totalSets={totalSets}
      exercises={exercises}
      volumeChange={volumeChange}
      weekCount={weekCount || 1}
    />
  );
}
