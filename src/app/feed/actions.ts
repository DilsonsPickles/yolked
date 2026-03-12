"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleReaction(sessionId: string, reaction: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if user already reacted to this session
  const { data: existing } = await supabase
    .from("workout_reactions")
    .select("id, reaction")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.reaction === reaction) {
      // Same reaction — remove it (toggle off)
      await supabase
        .from("workout_reactions")
        .delete()
        .eq("id", existing.id);
    } else {
      // Different reaction — update it
      await supabase
        .from("workout_reactions")
        .update({ reaction })
        .eq("id", existing.id);
    }
  } else {
    // No existing reaction — insert
    const { error } = await supabase
      .from("workout_reactions")
      .insert({ session_id: sessionId, user_id: user.id, reaction });

    if (error) return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
