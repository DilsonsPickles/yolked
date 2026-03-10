"use server";

import { createClient } from "@/lib/supabase/server";

export async function startSession(workoutId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check for existing incomplete session
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("workout_id", workoutId)
    .eq("user_id", user.id)
    .is("completed_at", null)
    .single();

  if (existing) {
    return { sessionId: existing.id };
  }

  // Create new session
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({ workout_id: workoutId, user_id: user.id })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { error: sessionError?.message || "Failed to start session" };
  }

  // Get workout exercises to pre-create sets
  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("exercise_id, target_sets, target_reps, target_weight")
    .eq("workout_id", workoutId)
    .order("sort_order");

  if (workoutExercises && workoutExercises.length > 0) {
    const sets = workoutExercises.flatMap((we) =>
      Array.from({ length: we.target_sets }, (_, i) => ({
        session_id: session.id,
        exercise_id: we.exercise_id,
        set_number: i + 1,
        reps_completed: we.target_reps,
        weight_used: we.target_weight,
        completed: false,
      }))
    );

    await supabase.from("session_sets").insert(sets);
  }

  return { sessionId: session.id };
}

export async function updateSet(
  setId: string,
  data: {
    reps_completed?: number;
    weight_used?: number | null;
    completed?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const updateData: Record<string, unknown> = { ...data };
  if (data.completed) {
    updateData.completed_at = new Date().toISOString();
  } else if (data.completed === false) {
    updateData.completed_at = null;
  }

  const { error } = await supabase
    .from("session_sets")
    .update(updateData)
    .eq("id", setId);

  if (error) return { error: error.message };
}

export async function completeSession(sessionId: string, notes: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workout_sessions")
    .update({
      completed_at: new Date().toISOString(),
      notes,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
}
