import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { BottomNav } from "@/components/nav";
import { GoalClient } from "./goal-client";
import type { Exercise, Goal, GoalRung } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GoalPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: goal } = await supabase
    .from("goals")
    .select("*, benchmark:exercises!benchmark_exercise_id(id, name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();
  if (!goal) notFound();

  const { data: rungs } = await supabase
    .from("goal_rungs")
    .select("*, exercise:exercises(*)")
    .eq("goal_id", id)
    .order("sort_order");

  return (
    <div className="min-h-screen pb-20">
      <GoalClient
        goal={goal as Goal & { benchmark: { id: string; name: string } | null }}
        rungs={(rungs as (GoalRung & { exercise: Exercise | null })[]) || []}
      />
      <BottomNav />
    </div>
  );
}
