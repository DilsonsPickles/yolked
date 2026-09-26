import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { startSession } from "./actions";
import { ActiveSession } from "@/components/workouts/active-session";
import type {
  Exercise,
  WorkoutBlock,
  WorkoutExercise,
  SessionSet,
} from "@/lib/types/database";
import { signMediaByExercise } from "@/lib/media/signed-urls";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PerformWorkoutPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get workout with owner info
  const { data: workout } = await supabase
    .from("workouts")
    .select("*, owner:profiles!user_id(display_name)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!workout) notFound();

  const isOwner = workout.user_id === user?.id;
  const ownerName = !isOwner
    ? (workout.owner as unknown as { display_name: string | null })
        ?.display_name || "Someone"
    : null;

  // Start or resume session
  const result = await startSession(id);

  if (result.error || !result.sessionId) {
    redirect("/workouts");
  }

  const sessionId = result.sessionId;

  // Get session
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) redirect("/workouts");

  // Get workout exercises (with exercise details), blocks and session sets
  const [{ data: workoutExercises }, { data: blocks }, { data: sessionSets }] =
    await Promise.all([
      supabase
        .from("workout_exercises")
        .select("*, exercise:exercises(*)")
        .eq("workout_id", id)
        .order("sort_order"),
      supabase
        .from("workout_blocks")
        .select("*")
        .eq("workout_id", id)
        .order("sort_order"),
      supabase
        .from("session_sets")
        .select("*")
        .eq("session_id", sessionId)
        .order("set_number"),
    ]);

  // Fetch previous completed session for this workout
  const { data: previousSession } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("workout_id", id)
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  const previousSetsByExercise: Record<string, SessionSet[]> = {};
  if (previousSession) {
    const { data: prevSets } = await supabase
      .from("session_sets")
      .select("*")
      .eq("session_id", previousSession.id)
      .order("set_number");

    for (const set of (prevSets as SessionSet[]) || []) {
      if (!previousSetsByExercise[set.exercise_id]) {
        previousSetsByExercise[set.exercise_id] = [];
      }
      previousSetsByExercise[set.exercise_id].push(set);
    }
  }

  // Group sets by exercise
  const exercises = (
    (workoutExercises as (WorkoutExercise & { exercise: Exercise })[]) || []
  ).map((we) => ({
    exercise: we.exercise,
    workoutExercise: we,
    sets: ((sessionSets as SessionSet[]) || []).filter(
      (s) => s.exercise_id === we.exercise_id
    ),
  }));

  // Signed URLs for private clips (owner's media only; empty for shared workouts)
  const mediaByExercise = await signMediaByExercise(
    supabase,
    exercises.map((e) => ({ id: e.exercise.id, media: e.exercise.media ?? [] }))
  );

  return (
    <ActiveSession
      sessionId={sessionId}
      workoutId={id}
      workoutName={ownerName ? `${workout.name} (by ${ownerName})` : workout.name}
      exercises={exercises}
      blocks={(blocks as WorkoutBlock[]) || []}
      mediaByExercise={mediaByExercise}
      startedAt={session.started_at}
      previousSetsByExercise={previousSetsByExercise}
    />
  );
}
