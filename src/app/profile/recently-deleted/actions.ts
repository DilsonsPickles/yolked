"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export async function deleteAllPermanently() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("user_id", user.id)
    .not("deleted_at", "is", null);

  if (error) return { error: error.message };

  revalidatePath("/profile/recently-deleted");
  return { success: true };
}
