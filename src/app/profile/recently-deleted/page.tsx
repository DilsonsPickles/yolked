import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav";
import { RecentlyDeletedClient } from "./recently-deleted-client";

export default async function RecentlyDeletedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Auto-purge workouts deleted more than 30 days ago
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  await supabase
    .from("workouts")
    .delete()
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .lt("deleted_at", thirtyDaysAgo);

  // Fetch remaining soft-deleted workouts
  const { data: deletedWorkouts } = await supabase
    .from("workouts")
    .select("id, name, description, deleted_at, workout_exercises(count)")
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  return (
    <>
      <RecentlyDeletedClient workouts={deletedWorkouts || []} />
      <BottomNav />
    </>
  );
}
