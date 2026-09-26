import type { WorkoutBlockInput, WorkoutExerciseInput } from "@/app/workouts/actions";
import type { BlockSection } from "@/lib/types/database";

export const BLOCK_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export const SECTION_LABEL: Record<BlockSection, string> = {
  prep: "Prep",
  main: "Main",
  auxiliary: "Auxiliary",
  finishing: "Finishing",
};

export function defaultBlock(label: string): WorkoutBlockInput {
  return {
    label,
    section: "main",
    rounds_min: 1,
    rounds_max: 1,
    rest_seconds: null,
    notes: null,
  };
}

/** Block labels in the order they first appear in the exercise list. */
export function usedLabelsInOrder(
  exercises: { block_label: string | null; sort_order: number }[]
): string[] {
  const seen: string[] = [];
  for (const e of [...exercises].sort((a, b) => a.sort_order - b.sort_order)) {
    if (e.block_label && !seen.includes(e.block_label)) seen.push(e.block_label);
  }
  return seen;
}

/** Returns an error message, or null when the workout is valid. */
export function validateWorkout(
  exercises: WorkoutExerciseInput[],
  blocks: WorkoutBlockInput[]
): string | null {
  const byLabel = new Map(blocks.map((b) => [b.label, b]));
  for (const label of usedLabelsInOrder(exercises)) {
    const b = byLabel.get(label);
    if (!b) return `Block ${label} has no settings`;
    if (b.rounds_min < 1) return `Block ${label}: rounds must be at least 1`;
    if (b.rounds_min > b.rounds_max) return `Block ${label}: rounds min is greater than max`;
  }
  const ordered = [...exercises].sort((a, b) => a.sort_order - b.sort_order);
  for (let i = 0; i < ordered.length; i++) {
    const e = ordered[i];
    if (e.target_reps == null && e.target_seconds == null) {
      if (!e.prescription_text) return `Exercise ${i + 1}: set reps or seconds`;
      continue;
    }
    if (e.target_reps == null && e.target_seconds != null && e.target_seconds <= 0) {
      return `Exercise ${i + 1}: seconds must be greater than zero`;
    }
    if (e.target_sets < 1) return `Exercise ${i + 1}: sets must be at least 1`;
  }
  return null;
}
