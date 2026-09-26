"use server";

import { createClient } from "@/lib/supabase/server";
import { buildSessionSets } from "@/lib/sessions/build-sets";

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
    .is("deleted_at", null)
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

  // Get workout exercises and blocks to pre-create sets
  const [{ data: workoutExercises }, { data: blocks }] = await Promise.all([
    supabase
      .from("workout_exercises")
      .select(
        "exercise_id, block_id, target_sets, target_reps, target_seconds, target_weight, each_side"
      )
      .eq("workout_id", workoutId)
      .order("sort_order"),
    supabase
      .from("workout_blocks")
      .select("id, rounds_max")
      .eq("workout_id", workoutId),
  ]);

  if (workoutExercises && workoutExercises.length > 0) {
    const sets = buildSessionSets(workoutExercises, blocks ?? []).map((s) => ({
      ...s,
      session_id: session.id,
    }));
    const { error: setsError } = await supabase.from("session_sets").insert(sets);
    if (setsError) return { error: setsError.message };
  }

  return { sessionId: session.id };
}

export async function updateSet(
  setId: string,
  data: {
    reps_completed?: number | null;
    weight_used?: number | null;
    seconds_completed?: number | null;
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
