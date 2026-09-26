"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BlockSection, Prescription } from "@/lib/types/database";
import { validateWorkout } from "@/lib/workouts/blocks";
import { insertWorkoutContents } from "@/lib/workouts/insert-contents";

export interface WorkoutExerciseInput extends Prescription {
  exercise_id: string;
  sort_order: number;
  /** Letter of the block this exercise belongs to, or null for straight sets. */
  block_label: string | null;
  notes: string | null;
}

export interface WorkoutBlockInput {
  label: string;
  section: BlockSection;
  rounds_min: number;
  rounds_max: number;
  rest_seconds: number | null;
  notes: string | null;
}

export async function createWorkout(
  name: string,
  description: string | null,
  exercises: WorkoutExerciseInput[],
  blocks: WorkoutBlockInput[] = []
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const invalid = validateWorkout(exercises, blocks);
  if (invalid) return { error: invalid };

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({ name, description, user_id: user.id })
    .select("id")
    .single();

  if (workoutError || !workout) {
    return { error: workoutError?.message || "Failed to create workout" };
  }

  const result = await insertWorkoutContents(supabase, workout.id, exercises, blocks);
  if (result.error) return result;

  redirect(`/workouts`);
}

export async function updateWorkout(
  workoutId: string,
  name: string,
  description: string | null,
  exercises: WorkoutExerciseInput[],
  blocks: WorkoutBlockInput[] = []
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const invalid = validateWorkout(exercises, blocks);
  if (invalid) return { error: invalid };

  const { error: updateError } = await supabase
    .from("workouts")
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq("id", workoutId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  // Delete existing exercises and blocks, then re-insert
  await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
  await supabase.from("workout_blocks").delete().eq("workout_id", workoutId);

  const result = await insertWorkoutContents(supabase, workoutId, exercises, blocks);
  if (result.error) return result;

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
