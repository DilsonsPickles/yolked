"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addBro(shareCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const code = shareCode.trim().toUpperCase();
  if (code.length !== 6) return { error: "Invalid bro code" };

  // Look up profile by share code (SECURITY DEFINER function bypasses RLS)
  const { data: targets, error: lookupError } = await supabase.rpc(
    "lookup_profile_by_share_code",
    { code }
  );

  if (lookupError || !targets || targets.length === 0) {
    return { error: "Bro code not found" };
  }

  const target = targets[0];
  if (target.id === user.id) return { error: "That's your own code!" };

  // Check if already bros
  const { data: existing } = await supabase
    .from("bros")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("bro_id", target.id)
    .maybeSingle();

  if (existing) return { error: "Already bros!" };

  // Insert both directions via SECURITY DEFINER function
  const { error: addError } = await supabase.rpc("add_bro", {
    target_user_id: target.id,
  });

  if (addError) return { error: addError.message };

  revalidatePath("/bros");
  return { success: true, broName: target.display_name };
}

export async function removeBro(broId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Delete both directions
  await supabase
    .from("bros")
    .delete()
    .eq("user_id", user.id)
    .eq("bro_id", broId);

  await supabase
    .from("bros")
    .delete()
    .eq("user_id", broId)
    .eq("bro_id", user.id);

  // Remove workout shares between these users
  const { data: myWorkouts } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", user.id);

  if (myWorkouts && myWorkouts.length > 0) {
    await supabase
      .from("workout_shares")
      .delete()
      .eq("shared_with_user_id", broId)
      .in(
        "workout_id",
        myWorkouts.map((w) => w.id)
      );
  }

  // Clean up reactions between these users
  // Remove their reactions on my sessions
  const { data: mySessions } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id);

  if (mySessions && mySessions.length > 0) {
    await supabase
      .from("workout_reactions")
      .delete()
      .eq("user_id", broId)
      .in("session_id", mySessions.map((s) => s.id));
  }

  // Remove my reactions on their sessions
  const { data: theirSessions } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", broId);

  if (theirSessions && theirSessions.length > 0) {
    await supabase
      .from("workout_reactions")
      .delete()
      .eq("user_id", user.id)
      .in("session_id", theirSessions.map((s) => s.id));
  }

  revalidatePath("/bros");
  revalidatePath("/");
  return { success: true };
}
