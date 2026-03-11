"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
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
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", workoutId)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) {
    return { error: error.message };
  }

  redirect("/workouts");
}

export async function shareWorkout(workoutId: string, broId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workout_shares")
    .upsert({ workout_id: workoutId, shared_with_user_id: broId });

  if (error) return { error: error.message };

  revalidatePath("/workouts");
  return { success: true };
}

export async function unshareWorkout(workoutId: string, broId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workout_shares")
    .delete()
    .eq("workout_id", workoutId)
    .eq("shared_with_user_id", broId);

  if (error) return { error: error.message };

  revalidatePath("/workouts");
  return { success: true };
}
