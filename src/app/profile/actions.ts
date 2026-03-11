"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateDisplayName(formData: FormData) {
  const displayName = formData.get("displayName") as string;

  if (!displayName || displayName.trim().length === 0) {
    return { error: "Display name cannot be empty" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Update profiles table
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim() })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  // Update auth metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: displayName.trim() },
  });

  if (authError) return { error: authError.message };

  revalidatePath("/profile");
  revalidatePath("/");
  return { success: true };
}
