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

  // Auto-purge items deleted more than 30 days ago
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  await Promise.all([
    supabase
      .from("workouts")
      .delete()
      .eq("user_id", user.id)
      .not("deleted_at", "is", null)
      .lt("deleted_at", thirtyDaysAgo),
    supabase
      .from("workout_sessions")
      .delete()
      .eq("user_id", user.id)
      .not("deleted_at", "is", null)
      .lt("deleted_at", thirtyDaysAgo),
  ]);

  // Fetch remaining soft-deleted items
  const [{ data: deletedWorkouts }, { data: deletedSessions }] =
    await Promise.all([
      supabase
        .from("workouts")
        .select("id, name, description, deleted_at, workout_exercises(count)")
        .eq("user_id", user.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      supabase
        .from("workout_sessions")
        .select(
          "id, started_at, completed_at, deleted_at, workout:workouts(name)"
        )
        .eq("user_id", user.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
    ]);

  return (
    <>
      <RecentlyDeletedClient
        workouts={deletedWorkouts || []}
        sessions={deletedSessions || []}
      />
      <BottomNav />
    </>
  );
}
