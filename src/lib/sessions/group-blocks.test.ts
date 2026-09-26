import { describe, it, expect } from "vitest";
import { groupByBlock, isLastExerciseOfRound } from "./group-blocks";
import type { WorkoutBlock } from "@/lib/types/database";

const block = (id: string, label: string, sort_order: number): WorkoutBlock => ({
  id,
  workout_id: "w",
  label,
  sort_order,
  section: "main",
  rounds_min: 1,
  rounds_max: 2,
  rest_seconds: null,
  notes: null,
});

const ex = (exercise_id: string, block_id: string | null) => ({
  exercise_id,
  block_id,
});

describe("groupByBlock", () => {
  it("solo exercises become their own group", () => {
    const groups = groupByBlock([ex("a", null), ex("b", null)], []);
    expect(groups).toHaveLength(2);
    expect(groups[0].block).toBeNull();
    expect(groups[0].exercises.map((e) => e.exercise_id)).toEqual(["a"]);
  });

  it("exercises sharing a block are grouped in workout order", () => {
    const groups = groupByBlock(
      [ex("a", "b1"), ex("b", "b1"), ex("c", null), ex("d", "b2")],
      [block("b1", "A", 0), block("b2", "B", 1)]
    );
    expect(groups.map((g) => [g.block?.label ?? null, g.exercises.map((e) => e.exercise_id)])).toEqual([
      ["A", ["a", "b"]],
      [null, ["c"]],
      ["B", ["d"]],
    ]);
  });

  it("groups by first appearance even when the block rows come in another order", () => {
    const groups = groupByBlock(
      [ex("x", "b2"), ex("y", "b1"), ex("z", "b2")],
      [block("b1", "A", 0), block("b2", "B", 1)]
    );
    expect(groups.map((g) => g.block?.label)).toEqual(["B", "A"]);
    expect(groups[0].exercises.map((e) => e.exercise_id)).toEqual(["x", "z"]);
  });

  it("treats an unknown block id as solo", () => {
    const groups = groupByBlock([ex("a", "missing")], []);
    expect(groups[0].block).toBeNull();
  });
});

describe("isLastExerciseOfRound", () => {
  it("is always true for solo exercises", () => {
    const [g] = groupByBlock([ex("a", null)], []);
    expect(isLastExerciseOfRound(g, 0)).toBe(true);
  });

  it("is true only for the last exercise in a block", () => {
    const [g] = groupByBlock([ex("a", "b1"), ex("b", "b1")], [block("b1", "A", 0)]);
    expect(isLastExerciseOfRound(g, 0)).toBe(false);
    expect(isLastExerciseOfRound(g, 1)).toBe(true);
  });
});
