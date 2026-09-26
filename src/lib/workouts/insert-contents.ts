import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkoutBlockInput, WorkoutExerciseInput } from "@/app/workouts/actions";
import { usedLabelsInOrder } from "@/lib/workouts/blocks";

/**
 * Insert blocks and exercises for a workout. Used by create, update and the
 * goal-based session builder. The caller has already validated ownership.
 */
export async function insertWorkoutContents(
  supabase: SupabaseClient,
  workoutId: string,
  exercises: WorkoutExerciseInput[],
  blocks: WorkoutBlockInput[]
): Promise<{ error?: string }> {
  const labels = usedLabelsInOrder(exercises);
  const blockIdByLabel = new Map<string, string>();

  if (labels.length > 0) {
    const byLabel = new Map(blocks.map((b) => [b.label, b]));
    const rows = labels.map((label, i) => {
      const b = byLabel.get(label)!;
      return {
        workout_id: workoutId,
        label,
        sort_order: i,
        section: b.section,
        rounds_min: b.rounds_min,
        rounds_max: b.rounds_max,
        rest_seconds: b.rest_seconds,
        notes: b.notes,
      };
    });
    const { data, error } = await supabase
      .from("workout_blocks")
      .insert(rows)
      .select("id, label");
    if (error || !data) return { error: error?.message || "Failed to save blocks" };
    for (const b of data) blockIdByLabel.set(b.label, b.id);
  }

  if (exercises.length > 0) {
    const rows = exercises.map(({ block_label, ...ex }) => ({
      ...ex,
      workout_id: workoutId,
      block_id: block_label ? (blockIdByLabel.get(block_label) ?? null) : null,
    }));
    const { error } = await supabase.from("workout_exercises").insert(rows);
    if (error) return { error: error.message };
  }

  return {};
}
