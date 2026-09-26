import { describe, it, expect } from "vitest";
import { usedLabelsInOrder, validateWorkout, defaultBlock } from "./blocks";
import type { WorkoutExerciseInput, WorkoutBlockInput } from "@/app/workouts/actions";

const ex = (over: Partial<WorkoutExerciseInput>): WorkoutExerciseInput => ({
  exercise_id: "x",
  sort_order: 0,
  block_label: null,
  notes: null,
  target_sets: 3,
  target_reps: 10,
  target_reps_max: null,
  target_seconds: null,
  target_weight: null,
  tempo: null,
  method: null,
  each_side: false,
  prescription_text: null,
  ...over,
});

const block = (label: string, over: Partial<WorkoutBlockInput> = {}): WorkoutBlockInput => ({
  ...defaultBlock(label),
  ...over,
});

describe("usedLabelsInOrder", () => {
  it("orders by first appearance and ignores solo rows", () => {
    const rows = [
      ex({ sort_order: 0, block_label: "B" }),
      ex({ sort_order: 1, block_label: null }),
      ex({ sort_order: 2, block_label: "A" }),
      ex({ sort_order: 3, block_label: "B" }),
    ];
    expect(usedLabelsInOrder(rows)).toEqual(["B", "A"]);
  });

  it("respects sort_order rather than array order", () => {
    const rows = [ex({ sort_order: 5, block_label: "C" }), ex({ sort_order: 1, block_label: "A" })];
    expect(usedLabelsInOrder(rows)).toEqual(["A", "C"]);
  });
});

describe("validateWorkout", () => {
  it("accepts a plain workout with no blocks", () => {
    expect(validateWorkout([ex({})], [])).toBeNull();
  });

  it("requires block settings for every used label", () => {
    expect(validateWorkout([ex({ block_label: "C" })], [])).toBe("Block C has no settings");
  });

  it("rejects rounds min > max", () => {
    expect(
      validateWorkout([ex({ block_label: "A" })], [block("A", { rounds_min: 3, rounds_max: 2 })])
    ).toBe("Block A: rounds min is greater than max");
  });

  it("requires reps or seconds unless there is prescription text", () => {
    expect(validateWorkout([ex({ target_reps: null, target_seconds: null })], [])).toBe(
      "Exercise 1: set reps or seconds"
    );
    expect(
      validateWorkout([ex({ target_reps: null, target_seconds: null, prescription_text: "practice in full" })], [])
    ).toBeNull();
  });

  it("rejects a zero-second timed exercise", () => {
    expect(validateWorkout([ex({ target_reps: null, target_seconds: 0 })], [])).toBe(
      "Exercise 1: seconds must be greater than zero"
    );
  });
});
