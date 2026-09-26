import { describe, it, expect } from "vitest";
import { parsePrescription, formatPrescription } from "./prescription";

describe("parsePrescription", () => {
  it("reps range with tempo and iso", () => {
    const p = parsePrescription("6-8x [3012] 1” TTC hold (deepest progression)");
    expect(p).toMatchObject({
      target_sets: 1,
      target_reps: 6,
      target_reps_max: 8,
      tempo: "[3012]",
      method: "iso",
      target_seconds: null,
      each_side: false,
    });
    expect(p.prescription_text).toBe(
      "6-8x [3012] 1” TTC hold (deepest progression)"
    );
  });

  it("sets x reps", () => {
    expect(
      parsePrescription("2-3x 10x pulses + 10” iso. in end-range ea. rep")
    ).toMatchObject({
      target_sets: 2,
      target_reps: 10,
      method: "pulse",
      each_side: false,
    });
  });

  it("timed hold each side with CR", () => {
    expect(
      parsePrescription("30” CR + 30” breathing to end-range ea.")
    ).toMatchObject({
      target_sets: 1,
      target_reps: null,
      target_seconds: 30,
      method: "cr",
      each_side: true,
    });
  });

  it("sets of seconds", () => {
    expect(
      parsePrescription("2x 45-60” hold (minimal rest between)")
    ).toMatchObject({ target_sets: 2, target_seconds: 45, target_reps: null });
  });

  it("minutes", () => {
    expect(parsePrescription("3-4’ SD practice")).toMatchObject({
      target_seconds: 180,
      method: "sd",
    });
  });

  it("drop set of holds", () => {
    expect(
      parsePrescription("DS: 20”, 15”, 10” holds (minimal rest)")
    ).toMatchObject({ target_sets: 3, target_seconds: 20, method: "ds" });
  });

  it("descending reps each side alternating", () => {
    expect(parsePrescription("DeR: 6x, 5x, 4x ea. alt.")).toMatchObject({
      target_sets: 3,
      target_reps: 6,
      method: "der",
      each_side: true,
    });
  });

  it("practice in full has no numbers", () => {
    expect(parsePrescription("practice in full")).toMatchObject({
      target_sets: 1,
      target_reps: null,
      target_seconds: null,
      method: null,
    });
  });

  it("accumulated hang", () => {
    expect(
      parsePrescription("60”+ accu. ea. AND 5x 3” iso. (rest as needed)")
    ).toMatchObject({ target_seconds: 60, method: "accu", each_side: true });
  });

  it("straight quotes work too", () => {
    expect(parsePrescription('6x 5" holds ea. [1015]')).toMatchObject({
      target_sets: 6,
      target_seconds: 5,
      target_reps: null,
      tempo: "[1015]",
      each_side: true,
    });
  });

  it("reps with tempo and 'NO iso'", () => {
    expect(parsePrescription("10-15x ea. [2010] NO iso. (alt.)")).toMatchObject({
      target_sets: 1,
      target_reps: 10,
      target_reps_max: 15,
      tempo: "[2010]",
      each_side: true,
    });
  });

  it("plain reps", () => {
    expect(parsePrescription("25x [1111] 1” top & bottom-iso.")).toMatchObject({
      target_sets: 1,
      target_reps: 25,
      tempo: "[1111]",
    });
  });

  it("sets of reps each side, sets across", () => {
    expect(parsePrescription("5x ea. SA [2311] 3\" bottom-iso.")).toMatchObject({
      target_sets: 1,
      target_reps: 5,
      each_side: true,
      tempo: "[2311]",
    });
  });

  it("work duration range", () => {
    expect(parsePrescription("60-90” work")).toMatchObject({
      target_sets: 1,
      target_seconds: 60,
    });
  });

  it("holds count as sets of seconds each side", () => {
    expect(parsePrescription("3x 10-15” holds ea. (alt.)")).toMatchObject({
      target_sets: 3,
      target_seconds: 10,
      each_side: true,
      method: "iso",
    });
  });

  it("normalises whitespace in the kept text and ignores 'ea. rep'", () => {
    const p = parsePrescription("  6-8x   (increasing NBP ea. rep) ");
    expect(p.prescription_text).toBe("6-8x (increasing NBP ea. rep)");
    expect(p.each_side).toBe(false);
  });
});

describe("formatPrescription", () => {
  it("reps range with tempo", () => {
    expect(
      formatPrescription({
        target_sets: 3,
        target_reps: 6,
        target_reps_max: 8,
        tempo: "[3011]",
        each_side: false,
      })
    ).toBe("3 × 6-8 [3011]");
  });

  it("seconds each side", () => {
    expect(
      formatPrescription({
        target_sets: 2,
        target_seconds: 30,
        each_side: true,
        method: "cr",
      })
    ).toBe("2 × 30s CR ea.");
  });

  it("falls back to text", () => {
    expect(
      formatPrescription({ target_sets: 1, prescription_text: "practice in full" })
    ).toBe("practice in full");
  });

  it("single set omits the multiplier", () => {
    expect(formatPrescription({ target_sets: 1, target_reps: 10 })).toBe("10 reps");
    expect(formatPrescription({ target_sets: 1, target_seconds: 60 })).toBe("60s");
  });
});
