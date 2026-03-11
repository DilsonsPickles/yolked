"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- Workout actions ---

export async function restoreWorkout(workoutId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workouts")
    .update({ deleted_at: null })
    .eq("id", workoutId)
    .eq("user_id", user.id)
    .not("deleted_at", "is", null);

  if (error) return { error: error.message };

  revalidatePath("/profile/recently-deleted");
  revalidatePath("/workouts");
  return { success: true };
}

export async function permanentlyDeleteWorkout(workoutId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", user.id)
    .not("deleted_at", "is", null);

  if (error) return { error: error.message };

  revalidatePath("/profile/recently-deleted");
  return { success: true };
}

// --- Session actions ---

export async function restoreSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workout_sessions")
    .update({ deleted_at: null })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .not("deleted_at", "is", null);

  if (error) return { error: error.message };

  revalidatePath("/profile/recently-deleted");
  revalidatePath("/history");
  return { success: true };
}

export async function permanentlyDeleteSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .not("deleted_at", "is", null);

  if (error) return { error: error.message };

  revalidatePath("/profile/recently-deleted");
  return { success: true };
}

// --- Bulk actions ---

export async function deleteAllPermanently() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Delete both workouts and sessions
  const [workoutResult, sessionResult] = await Promise.all([
    supabase
      .from("workouts")
      .delete()
      .eq("user_id", user.id)
      .not("deleted_at", "is", null),
    supabase
      .from("workout_sessions")
      .delete()
      .eq("user_id", user.id)
      .not("deleted_at", "is", null),
  ]);

  if (workoutResult.error) return { error: workoutResult.error.message };
  if (sessionResult.error) return { error: sessionResult.error.message };

  revalidatePath("/profile/recently-deleted");
  return { success: true };
}
