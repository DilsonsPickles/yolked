import { describe, it, expect } from "vitest";
import { buildSessionSets } from "./build-sets";

const base = {
  target_reps: null as number | null,
  target_seconds: null as number | null,
  target_weight: null as number | null,
  each_side: false,
};

describe("buildSessionSets", () => {
  it("solo exercise: target_sets rows, no rounds", () => {
    const sets = buildSessionSets(
      [{ ...base, exercise_id: "a", block_id: null, target_sets: 3, target_reps: 5, target_weight: 60 }],
      []
    );
    expect(sets).toHaveLength(3);
    expect(sets[2]).toMatchObject({
      set_number: 3, round_number: null, side: null, reps_completed: 5, weight_used: 60, seconds_completed: null, completed: false,
    });
  });

  it("block exercise: rounds_max × target_sets, with round numbers", () => {
    const sets = buildSessionSets(
      [{ ...base, exercise_id: "a", block_id: "b1", target_sets: 1, target_reps: 6 }],
      [{ id: "b1", rounds_max: 3 }]
    );
    expect(sets.map((s) => [s.set_number, s.round_number])).toEqual([[1, 1], [2, 2], [3, 3]]);
  });

  it("multiple sets per round keep round numbers", () => {
    const sets = buildSessionSets(
      [{ ...base, exercise_id: "a", block_id: "b1", target_sets: 2, target_seconds: 10 }],
      [{ id: "b1", rounds_max: 2 }]
    );
    expect(sets.map((s) => [s.set_number, s.round_number])).toEqual([[1, 1], [2, 1], [3, 2], [4, 2]]);
  });

  it("each side doubles rows with L/R", () => {
    const sets = buildSessionSets(
      [{ ...base, exercise_id: "a", block_id: "b1", target_sets: 1, target_seconds: 30, each_side: true }],
      [{ id: "b1", rounds_max: 2 }]
    );
    expect(sets.map((s) => [s.set_number, s.round_number, s.side, s.seconds_completed])).toEqual([
      [1, 1, "L", 30], [2, 1, "R", 30], [3, 2, "L", 30], [4, 2, "R", 30],
    ]);
  });

  it("unknown block id falls back to one round", () => {
    expect(
      buildSessionSets([{ ...base, exercise_id: "a", block_id: "missing", target_sets: 2, target_reps: 8 }], [])
    ).toHaveLength(2);
  });

  it("never produces zero rows", () => {
    expect(buildSessionSets([{ ...base, exercise_id: "a", block_id: null, target_sets: 0 }], [])).toHaveLength(1);
  });

  it("keeps exercise order and independent numbering per exercise", () => {
    const sets = buildSessionSets(
      [
        { ...base, exercise_id: "a", block_id: "b1", target_sets: 1, target_reps: 5 },
        { ...base, exercise_id: "b", block_id: "b1", target_sets: 1, target_reps: 5 },
      ],
      [{ id: "b1", rounds_max: 2 }]
    );
    expect(sets.map((s) => `${s.exercise_id}${s.set_number}`)).toEqual(["a1", "a2", "b1", "b2"]);
  });
});
