import { describe, it, expect } from "vitest";
import { parseProgramme, parseRounds, type RawProgramme } from "./parse";
import { slugify } from "../../src/lib/slug";
import { youtubeStart } from "../../src/lib/youtube";
import raw1 from "../../data/movemore/B1P1.raw.json";
import raw2 from "../../data/movemore/B1P2.raw.json";

describe("helpers", () => {
  it("slugify", () => {
    expect(slugify("Pronated, Supinated, AND Active hang")).toBe(
      "pronated_supinated_and_active_hang"
    );
    expect(slugify("5' wrist-strength & mobility routine")).toBe(
      "5_wrist_strength_mobility_routine"
    );
    expect(slugify("‘Butcher’s block’")).toBe("butchers_block");
  });

  it("youtubeStart", () => {
    expect(youtubeStart("https://www.youtube.com/watch?v=x&t=151s")).toBe(151);
    expect(youtubeStart("https://www.youtube.com/watch?v=x&t=4s")).toBe(4);
    expect(youtubeStart("https://youtu.be/x")).toBeNull();
    expect(youtubeStart("https://www.youtube.com/watch?v=_hoONihLqQg&t")).toBeNull();
  });

  it("parseRounds", () => {
    expect(parseRounds("2-3 rounds / ca. 90” rest")).toEqual({
      rounds_min: 2, rounds_max: 3, rest_seconds: 90,
    });
    expect(parseRounds("1-2 rounds / minimal rest")).toEqual({
      rounds_min: 1, rounds_max: 2, rest_seconds: null,
    });
    expect(parseRounds("1 round")).toEqual({ rounds_min: 1, rounds_max: 1, rest_seconds: null });
    expect(parseRounds("2-3 rounds / 60-90” rest BETWEEN sets")).toEqual({
      rounds_min: 2, rounds_max: 3, rest_seconds: 60,
    });
    expect(parseRounds("3 rounds / 2-3’ rest")).toEqual({
      rounds_min: 3, rounds_max: 3, rest_seconds: 120,
    });
    expect(parseRounds("1-2 rounds 10’ ea., OR 2-4 rounds 5’ ea.")).toEqual({
      rounds_min: 1, rounds_max: 2, rest_seconds: null,
    });
  });
});

describe("parseProgramme B1P1", () => {
  const p = parseProgramme(raw1 as unknown as RawProgramme);

  it("has four routines plus projects", () => {
    expect(p.routines.map((r) => r.name)).toEqual([
      "SSP A",
      "SSP B",
      "Upper-body Strength & Mobility",
      "Lower-body Complexity",
      "Movement Projects",
    ]);
    expect(p.routines[0].frequency).toBe("4-6x per week");
    expect(p.routines[2].frequency).toBe("1-2x per week");
  });

  it("UBSM has blocks A–G with the right sections and rounds", () => {
    const u = p.routines[2];
    expect(u.blocks.map((b) => `${b.label}:${b.section}`)).toEqual([
      "A:prep", "B:prep", "C:main", "D:main", "E:main", "F:auxiliary", "G:finishing",
    ]);
    expect(u.blocks[2]).toMatchObject({ rounds_min: 2, rounds_max: 3, rest_seconds: 90 });
    expect(u.blocks[1]).toMatchObject({ rounds_min: 1, rounds_max: 2, rest_seconds: null });
    expect(u.blocks[2].exercises[0]).toMatchObject({
      label: "C1",
      exercise_id: "mm_ring_row_progression",
      target_reps: 6,
      target_reps_max: 8,
      tempo: "[3012]",
    });
  });

  it("SSP A and B are separate single-block routines", () => {
    expect(p.routines[0].blocks).toHaveLength(1);
    expect(p.routines[0].blocks[0].exercises).toHaveLength(10);
    expect(p.routines[1].blocks[0].exercises).toHaveLength(5);
    expect(p.routines[0].blocks[0].section).toBe("main");
  });

  it("LBC includes the split squat despite the footnote marker", () => {
    const l = p.routines[3];
    const c = l.blocks.find((b) => b.label === "C")!;
    expect(c.exercises.map((e) => e.exercise_id)).toEqual([
      "mm_split_squat",
      "mm_single_leg_reach",
    ]);
    expect(c).toMatchObject({ rounds_min: 3, rounds_max: 3, rest_seconds: 120 });
  });

  it("dedupes exercises across routines and keeps the primary link first", () => {
    const hang = p.exercises.find((e) => e.id === "mm_pronated_supinated_and_active_hang")!;
    expect(hang.links).toHaveLength(3);
    expect(hang.links[0]).toMatchObject({
      url: "https://www.youtube.com/watch?v=bnWaw_-m9XU&t=5s",
      start_seconds: 5,
    });
    expect(p.exercises.filter((e) => e.id === hang.id)).toHaveLength(1);
  });

  it("keeps side links with their anchor as label", () => {
    const wb = p.exercises.find((e) => e.id === "mm_wall_bridge_rotations")!;
    expect(wb.links[0].label).toBe("Demo");
    expect(wb.links[1]).toMatchObject({
      label: "review webinar notes",
      url: "https://www.youtube.com/watch?v=O5-X1xnd0iw&t=7652s",
      start_seconds: 7652,
    });
  });

  it("classifies kinds", () => {
    const byId = Object.fromEntries(p.exercises.map((e) => [e.id, e.kind]));
    expect(byId["mm_ring_row_progression"]).toBe("strength");
    expect(byId["mm_cross_leg_stretch_progression"]).toBe("mobility");
    expect(byId["mm_360_stick_roll"]).toBe("project");
    expect(byId["mm_passive_hang"]).toBe("skill");
  });

  it("projects routine uses the rounds line as its prescription", () => {
    const proj = p.routines[4];
    expect(proj.blocks).toHaveLength(1);
    expect(proj.blocks[0]).toMatchObject({ rounds_min: 1, rounds_max: 2 });
    expect(proj.blocks[0].exercises[0]).toMatchObject({
      exercise_id: "mm_360_stick_roll",
      target_seconds: 600,
    });
  });

  it("extracts the nine Zero Point benchmarks", () => {
    expect(p.benchmarks).toHaveLength(9);
    expect(p.benchmarks[0]).toMatchObject({
      name: "120s passive hang",
      exercise_id: "mm_passive_hang",
      target_seconds: 120,
      each_side: false,
    });
    expect(p.benchmarks[4]).toMatchObject({ name: "20min resting squat", target_seconds: 1200 });
    expect(p.benchmarks[7]).toMatchObject({ exercise_id: "mm_dragon_squat", each_side: true });
    const ex = p.exercises.find((e) => e.id === "mm_german_hang")!;
    expect(ex.name).toBe("German hang");
    expect(ex.links).toHaveLength(1);
  });
});

describe("parseProgramme B1P2", () => {
  const p = parseProgramme(raw2 as unknown as RawProgramme);

  it("has the same routine shape", () => {
    expect(p.routines).toHaveLength(5);
    expect(p.routines[3].blocks.map((b) => b.label)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });

  it("parses changed prescriptions", () => {
    const ssp = p.routines[1].blocks[0].exercises;
    expect(ssp[0]).toMatchObject({ exercise_id: "mm_cossack_squat", target_reps: 10, target_reps_max: 15, tempo: "[2010]" });
    expect(ssp[1]).toMatchObject({ target_sets: 3, target_seconds: 30, method: "ds", each_side: true });
  });
});
