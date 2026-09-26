import type { WorkoutBlock } from "@/lib/types/database";

export interface SessionGroup<T extends { exercise_id: string; block_id: string | null }> {
  block: WorkoutBlock | null;
  exercises: T[];
}

/**
 * Group a workout's exercises by block, in workout order. Exercises with no
 * block (or an unknown block id) become a solo group of one, which the
 * performer renders exactly as it always has.
 */
export function groupByBlock<T extends { exercise_id: string; block_id: string | null }>(
  exercises: T[],
  blocks: WorkoutBlock[]
): SessionGroup<T>[] {
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const groups: SessionGroup<T>[] = [];
  const groupByBlockId = new Map<string, SessionGroup<T>>();

  for (const ex of exercises) {
    const block = ex.block_id ? blockById.get(ex.block_id) : undefined;
    if (!block) {
      groups.push({ block: null, exercises: [ex] });
      continue;
    }
    let group = groupByBlockId.get(block.id);
    if (!group) {
      group = { block, exercises: [] };
      groupByBlockId.set(block.id, group);
      groups.push(group);
    }
    group.exercises.push(ex);
  }

  return groups;
}

/** Rest between rounds starts after the last exercise of a block round. */
export function isLastExerciseOfRound<T extends { exercise_id: string; block_id: string | null }>(
  group: SessionGroup<T>,
  exerciseIdx: number
): boolean {
  if (!group.block) return true;
  return exerciseIdx === group.exercises.length - 1;
}
