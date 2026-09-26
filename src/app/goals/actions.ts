"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Goal, GoalKind, GoalRung, WorkoutBlock, WorkoutExercise } from "@/lib/types/database";
import { applyRungAction, changedRungs, type RungAction } from "@/lib/goals/transitions";
import { composePractice } from "@/lib/goals/compose-practice";
import { insertWorkoutContents } from "@/lib/workouts/insert-contents";

async function ownedGoal(goalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: goal } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();
  if (!goal) return { error: "Goal not found" as const };

  return { supabase, user, goal: goal as Goal };
}

function revalidateGoal(goalId: string) {
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
}

export async function rungAction(goalId: string, rungId: string, action: RungAction) {
  const ctx = await ownedGoal(goalId);
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const { data: rungs, error } = await supabase
    .from("goal_rungs")
    .select("*")
    .eq("goal_id", goalId)
    .order("sort_order");
  if (error || !rungs) return { error: error?.message || "Failed to load rungs" };

  const before = rungs as GoalRung[];
  const after = applyRungAction(before, rungId, action, new Date().toISOString());
  const changed = changedRungs(before, after);
  if (changed.length === 0) return { error: "That step isn't available for this rung" };

  for (const r of changed) {
    const { error: upError } = await supabase
      .from("goal_rungs")
      .update({ status: r.status, started_at: r.started_at, graduated_at: r.graduated_at })
      .eq("id", r.id)
      .eq("goal_id", goalId);
    if (upError) return { error: upError.message };
  }

  revalidateGoal(goalId);
  return { success: true };
}

export async function updateRungGraduateWhen(goalId: string, rungId: string, text: string) {
  const ctx = await ownedGoal(goalId);
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("goal_rungs")
    .update({ graduate_when: text.trim() })
    .eq("id", rungId)
    .eq("goal_id", goalId);
  if (error) return { error: error.message };

  revalidateGoal(goalId);
  return { success: true };
}

export async function addRung(goalId: string, exerciseId: string) {
  const ctx = await ownedGoal(goalId);
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const { data: last } = await supabase
    .from("goal_rungs")
    .select("sort_order")
    .eq("goal_id", goalId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count } = await supabase
    .from("goal_rungs")
    .select("id", { count: "exact", head: true })
    .eq("goal_id", goalId);

  const { error } = await supabase.from("goal_rungs").insert({
    goal_id: goalId,
    sort_order: (last?.sort_order ?? -1) + 1,
    exercise_id: exerciseId,
    target_sets: 3,
    target_reps: 5,
    graduate_when: "",
    status: (count ?? 0) === 0 ? "form" : "locked",
    started_at: (count ?? 0) === 0 ? new Date().toISOString() : null,
  });
  if (error) return { error: error.message };

  revalidateGoal(goalId);
  return { success: true };
}

export async function removeRung(goalId: string, rungId: string) {
  const ctx = await ownedGoal(goalId);
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("goal_rungs")
    .delete()
    .eq("id", rungId)
    .eq("goal_id", goalId);
  if (error) return { error: error.message };

  revalidateGoal(goalId);
  return { success: true };
}

export async function reorderRungs(goalId: string, orderedIds: string[]) {
  const ctx = await ownedGoal(goalId);
  if ("error" in ctx) return { error: ctx.error };

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await ctx.supabase
      .from("goal_rungs")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("goal_id", goalId);
    if (error) return { error: error.message };
  }

  revalidateGoal(goalId);
  return { success: true };
}

export async function setGoalAchieved(goalId: string, achieved: boolean) {
  const ctx = await ownedGoal(goalId);
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("goals")
    .update({ achieved_at: achieved ? new Date().toISOString() : null })
    .eq("id", goalId);
  if (error) return { error: error.message };

  revalidateGoal(goalId);
  return { success: true };
}

export async function createGoal(input: {
  name: string;
  kind: GoalKind;
  pass_condition: string;
  description: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = input.name.trim();
  if (!name) return { error: "Name is required" };
  if (!input.pass_condition.trim()) return { error: "Say what counts as done" };

  const { data: last } = await supabase
    .from("goals")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      name,
      kind: input.kind,
      pass_condition: input.pass_condition.trim(),
      description: input.description?.trim() || null,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message || "Failed to create goal" };

  revalidatePath("/goals");
  redirect(`/goals/${data.id}`);
}

export async function deleteGoal(goalId: string) {
  const ctx = await ownedGoal(goalId);
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", goalId);
  if (error) return { error: error.message };

  revalidatePath("/goals");
  revalidatePath("/");
  redirect("/goals");
}

/**
 * Build today's practice from the active rungs of the user's ladder goals,
 * optionally wrapped in the prep/finishing blocks of a base workout, and open
 * it in the builder for adjustment.
 */
export async function buildSessionFromGoals(baseWorkoutId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("*, rungs:goal_rungs(*)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .is("achieved_at", null)
    .order("sort_order");
  if (goalsError) return { error: goalsError.message };

  let base: { blocks: WorkoutBlock[]; exercises: WorkoutExercise[] } | null = null;
  if (baseWorkoutId) {
    const [{ data: blocks }, { data: exercises }] = await Promise.all([
      supabase.from("workout_blocks").select("*").eq("workout_id", baseWorkoutId).order("sort_order"),
      supabase.from("workout_exercises").select("*").eq("workout_id", baseWorkoutId).order("sort_order"),
    ]);
    base = { blocks: (blocks as WorkoutBlock[]) || [], exercises: (exercises as WorkoutExercise[]) || [] };
  }

  const date = new Date().toLocaleDateString("en-CA");
  const composed = composePractice({
    date,
    goals: (goals as (Goal & { rungs: GoalRung[] })[]) || [],
    base,
  });

  if (composed.exercises.length === 0) {
    return { error: "No active rungs to build from. Start a rung on a goal first." };
  }

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      name: composed.name,
      description: "Built from goal ladders. Adjust, then start.",
    })
    .select("id")
    .single();
  if (workoutError || !workout) return { error: workoutError?.message || "Failed to create workout" };

  const result = await insertWorkoutContents(supabase, workout.id, composed.exercises, composed.blocks);
  if (result.error) return { error: result.error };

  revalidatePath("/workouts");
  redirect(`/workouts/${workout.id}/edit`);
}
