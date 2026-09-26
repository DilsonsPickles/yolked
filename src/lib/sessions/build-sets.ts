import type { WorkoutBlock, WorkoutExercise } from "@/lib/types/database";

export interface NewSessionSet {
  exercise_id: string;
  set_number: number;
  round_number: number | null;
  side: "L" | "R" | null;
  reps_completed: number | null;
  weight_used: number | null;
  seconds_completed: number | null;
  completed: false;
}

type ExerciseInput = Pick<
  WorkoutExercise,
  | "exercise_id"
  | "block_id"
  | "target_sets"
  | "target_reps"
  | "target_seconds"
  | "target_weight"
  | "each_side"
>;
type BlockInput = Pick<WorkoutBlock, "id" | "rounds_max">;

/**
 * Pre-create the set rows for a session.
 *
 * - Solo exercise (no block): `target_sets` rows, no round number.
 * - Block exercise: `rounds_max × target_sets` rows, numbered by round.
 * - `each_side`: every set becomes two rows, L then R.
 *
 * `set_number` is a running index per exercise; reps, seconds and weight are
 * prefilled from the prescription so the performer only needs a tick.
 */
export function buildSessionSets(
  exercises: ExerciseInput[],
  blocks: BlockInput[]
): NewSessionSet[] {
  const roundsByBlock = new Map(blocks.map((b) => [b.id, Math.max(1, b.rounds_max)]));
  const out: NewSessionSet[] = [];

  for (const ex of exercises) {
    const rounds = ex.block_id ? (roundsByBlock.get(ex.block_id) ?? 1) : 1;
    const setsPerRound = Math.max(1, ex.target_sets ?? 1);
    const sides: ("L" | "R" | null)[] = ex.each_side ? ["L", "R"] : [null];
    let setNumber = 0;

    for (let round = 1; round <= rounds; round++) {
      for (let s = 0; s < setsPerRound; s++) {
        for (const side of sides) {
          setNumber += 1;
          out.push({
            exercise_id: ex.exercise_id,
            set_number: setNumber,
            round_number: ex.block_id ? round : null,
            side,
            reps_completed: ex.target_reps ?? null,
            weight_used: ex.target_weight ?? null,
            seconds_completed: ex.target_seconds ?? null,
            completed: false,
          });
        }
      }
    }
  }

  return out;
}
