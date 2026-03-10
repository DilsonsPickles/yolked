"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface WorkoutExerciseInput {
  exercise_id: string;
  sort_order: number;
  target_sets: number;
  target_reps: number;
  target_weight: number | null;
  notes: string | null;
}

export async function createWorkout(
  name: string,
  description: string | null,
  exercises: WorkoutExerciseInput[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({ name, description, user_id: user.id })
    .select("id")
    .single();

  if (workoutError || !workout) {
    return { error: workoutError?.message || "Failed to create workout" };
  }

  if (exercises.length > 0) {
    const rows = exercises.map((ex) => ({
      ...ex,
      workout_id: workout.id,
    }));

    const { error: exError } = await supabase
      .from("workout_exercises")
      .insert(rows);

    if (exError) {
      return { error: exError.message };
    }
  }

  redirect(`/workouts`);
}

export async function updateWorkout(
  workoutId: string,
  name: string,
  description: string | null,
  exercises: WorkoutExerciseInput[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error: updateError } = await supabase
    .from("workouts")
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq("id", workoutId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  // Delete existing exercises and re-insert
  await supabase
    .from("workout_exercises")
    .delete()
    .eq("workout_id", workoutId);

  if (exercises.length > 0) {
    const rows = exercises.map((ex) => ({
      ...ex,
      workout_id: workoutId,
    }));

    const { error: exError } = await supabase
      .from("workout_exercises")
      .insert(rows);

    if (exError) {
      return { error: exError.message };
    }
  }

  redirect(`/workouts`);
}

export async function deleteWorkout(workoutId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  redirect("/workouts");
}
