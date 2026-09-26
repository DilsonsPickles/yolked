import { describe, it, expect } from "vitest";
import { composePractice } from "./compose-practice";
import type { Goal, GoalRung, RungStatus, WorkoutBlock, WorkoutExercise } from "@/lib/types/database";

const goal = (id: string, name: string, kind: Goal["kind"], rungs: GoalRung[]): Goal & { rungs: GoalRung[] } => ({
  id, user_id: "u", name, kind, description: null, pass_condition: "", benchmark_exercise_id: null,
  benchmark_target_seconds: null, benchmark_target_reps: null, sort_order: 0, achieved_at: null,
  created_at: "", deleted_at: null, rungs,
});

const rung = (id: string, sort_order: number, status: RungStatus, over: Partial<GoalRung> = {}): GoalRung => ({
  id, goal_id: "g", sort_order, exercise_id: `ex_${id}`, target_sets: 3, target_reps: 5, target_reps_max: null,
  target_seconds: null, tempo: null, method: null, each_side: false, prescription_text: null,
  graduate_when: "", status, started_at: null, graduated_at: null, ...over,
});

const block = (id: string, label: string, section: WorkoutBlock["section"], sort_order: number): WorkoutBlock => ({
  id, workout_id: "w", label, sort_order, section, rounds_min: 1, rounds_max: 2, rest_seconds: null, notes: null,
});

const wex = (exercise_id: string, block_id: string | null, sort_order: number): WorkoutExercise => ({
  id: `we_${exercise_id}`, workout_id: "w", exercise_id, sort_order, block_id, notes: null,
  target_sets: 1, target_reps: null, target_reps_max: null, target_seconds: 60, target_weight: null,
  tempo: null, method: null, each_side: false, prescription_text: null,
});

describe("composePractice", () => {
  const strength = goal("g1", "Muscle up", "strength", [
    rung("s1", 0, "maintaining"),
    rung("s2", 1, "building", { tempo: "[3012]" }),
    rung("s3", 2, "locked"),
  ]);
  const mobility = goal("g2", "Pancake", "mobility", [
    rung("m1", 0, "form", { target_reps: null, target_seconds: 60, method: "cr" }),
    rung("m2", 1, "locked"),
  ]);

  it("one main block per active rung, maintaining rungs in one auxiliary block", () => {
    const out = composePractice({ date: "2026-09-26", goals: [strength, mobility], base: null });
    expect(out.name).toBe("Practice · 2026-09-26");
    expect(out.blocks.map((b) => `${b.label}:${b.section}`)).toEqual(["A:main", "B:main", "C:auxiliary"]);
    expect(out.blocks[0]).toMatchObject({ rounds_min: 3, rounds_max: 3, rest_seconds: 90 });
    expect(out.blocks[2]).toMatchObject({ rounds_min: 1, rounds_max: 1, rest_seconds: null });
    expect(out.exercises.map((e) => [e.exercise_id, e.block_label])).toEqual([
      ["ex_s2", "A"], ["ex_m1", "B"], ["ex_s1", "C"],
    ]);
    expect(out.exercises[0]).toMatchObject({ target_sets: 3, target_reps: 5, tempo: "[3012]", target_weight: null });
    expect(out.exercises[1]).toMatchObject({ target_seconds: 60, method: "cr", notes: "Form focus" });
    expect(out.exercises.map((e) => e.sort_order)).toEqual([0, 1, 2]);
  });

  it("copies prep and finishing blocks from a base workout around the goal work", () => {
    const base = {
      blocks: [
        block("b1", "A", "prep", 0), block("b2", "B", "prep", 1), block("b3", "C", "main", 2),
        block("b4", "F", "auxiliary", 3), block("b5", "G", "finishing", 4),
      ],
      exercises: [
        wex("hang", "b1", 0), wex("wrist", "b1", 1), wex("arch", "b2", 2), wex("row", "b3", 3),
        wex("plate", "b4", 4), wex("arm", "b5", 5),
      ],
    };
    const out = composePractice({ date: "2026-09-26", goals: [strength, mobility], base });
    expect(out.blocks.map((b) => `${b.label}:${b.section}`)).toEqual([
      "A:prep", "B:prep", "C:main", "D:main", "E:auxiliary", "F:finishing",
    ]);
    expect(out.exercises.map((e) => `${e.block_label}:${e.exercise_id}`)).toEqual([
      "A:hang", "A:wrist", "B:arch", "C:ex_s2", "D:ex_m1", "E:ex_s1", "F:arm",
    ]);
    expect(out.exercises[0]).toMatchObject({ target_seconds: 60 });
    expect(out.exercises.map((e) => e.sort_order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("no active rungs yields only the base prep/finishing", () => {
    const quiet = goal("g3", "Done", "strength", [rung("q1", 0, "maintaining")]);
    const out = composePractice({ date: "2026-01-01", goals: [quiet], base: null });
    expect(out.blocks.map((b) => b.section)).toEqual(["auxiliary"]);
    const none = composePractice({ date: "2026-01-01", goals: [], base: null });
    expect(none.blocks).toEqual([]);
    expect(none.exercises).toEqual([]);
  });
});
