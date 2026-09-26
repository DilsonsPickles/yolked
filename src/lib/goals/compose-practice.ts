import type { WorkoutBlockInput, WorkoutExerciseInput } from "@/app/workouts/actions";
import type { Goal, GoalRung, WorkoutBlock, WorkoutExercise } from "@/lib/types/database";
import { BLOCK_LABELS } from "@/lib/workouts/blocks";

export interface ComposeInput {
  /** YYYY-MM-DD, used in the workout name. */
  date: string;
  goals: (Goal & { rungs: GoalRung[] })[];
  /** Optional workout whose prep and finishing blocks are copied around the goal work. */
  base?: { blocks: WorkoutBlock[]; exercises: WorkoutExercise[] } | null;
}

export interface ComposedWorkout {
  name: string;
  blocks: WorkoutBlockInput[];
  exercises: WorkoutExerciseInput[];
}

interface Draft {
  block: Omit<WorkoutBlockInput, "label">;
  exercises: Omit<WorkoutExerciseInput, "block_label" | "sort_order">[];
}

function fromRung(rung: GoalRung): Omit<WorkoutExerciseInput, "block_label" | "sort_order"> {
  return {
    exercise_id: rung.exercise_id,
    target_sets: rung.target_sets ?? 1,
    target_reps: rung.target_reps,
    target_reps_max: rung.target_reps_max,
    target_seconds: rung.target_seconds,
    target_weight: null,
    tempo: rung.tempo,
    method: rung.method,
    each_side: rung.each_side,
    prescription_text: rung.prescription_text,
    notes: rung.status === "form" ? "Form focus" : null,
  };
}

function fromBase(
  base: NonNullable<ComposeInput["base"]>,
  section: WorkoutBlock["section"]
): Draft[] {
  return base.blocks
    .filter((b) => b.section === section)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((b) => ({
      block: {
        section: b.section,
        rounds_min: b.rounds_min,
        rounds_max: b.rounds_max,
        rest_seconds: b.rest_seconds,
        notes: b.notes,
      },
      exercises: base.exercises
        .filter((e) => e.block_id === b.id)
        .sort((a, c) => a.sort_order - c.sort_order)
        .map((e) => ({
          exercise_id: e.exercise_id,
          target_sets: e.target_sets,
          target_reps: e.target_reps,
          target_reps_max: e.target_reps_max,
          target_seconds: e.target_seconds,
          target_weight: e.target_weight,
          tempo: e.tempo,
          method: e.method,
          each_side: e.each_side,
          prescription_text: e.prescription_text,
          notes: e.notes,
        })),
    }))
    .filter((d) => d.exercises.length > 0);
}

/**
 * Compose a strength-plus-mobility session from goal ladders:
 * prep (from base) → one main block per active rung (form/building) →
 * one auxiliary block of maintaining rungs → finishing (from base).
 */
export function composePractice(input: ComposeInput): ComposedWorkout {
  const drafts: Draft[] = [];

  if (input.base) drafts.push(...fromBase(input.base, "prep"));

  const active: GoalRung[] = [];
  const maintaining: GoalRung[] = [];
  for (const goal of input.goals) {
    const sorted = [...goal.rungs].sort((a, b) => a.sort_order - b.sort_order);
    for (const r of sorted) {
      if (r.status === "form" || r.status === "building") active.push(r);
      else if (r.status === "maintaining") maintaining.push(r);
    }
  }

  for (const r of active) {
    drafts.push({
      block: { section: "main", rounds_min: 3, rounds_max: 3, rest_seconds: 90, notes: null },
      exercises: [fromRung(r)],
    });
  }

  if (maintaining.length > 0) {
    drafts.push({
      block: { section: "auxiliary", rounds_min: 1, rounds_max: 1, rest_seconds: null, notes: "Maintenance" },
      exercises: maintaining.map(fromRung),
    });
  }

  if (input.base) drafts.push(...fromBase(input.base, "finishing"));

  const blocks: WorkoutBlockInput[] = [];
  const exercises: WorkoutExerciseInput[] = [];
  let sort = 0;
  drafts.slice(0, BLOCK_LABELS.length).forEach((d, i) => {
    const label = BLOCK_LABELS[i];
    blocks.push({ label, ...d.block });
    for (const e of d.exercises) {
      exercises.push({ ...e, block_label: label, sort_order: sort++ });
    }
  });

  return { name: `Practice · ${input.date}`, blocks, exercises };
}
