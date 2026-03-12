"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function deleteAccount() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Delete profile row — CASCADE handles workouts, sessions, bros, shares
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  // Delete auth user via admin API
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: authError } = await admin.auth.admin.deleteUser(user.id);

  if (authError) {
    return { error: authError.message };
  }

  // Sign out the current session
  await supabase.auth.signOut();

  redirect("/login");
}
