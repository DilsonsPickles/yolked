import { describe, it, expect } from "vitest";
import { nextStatus, applyRungAction, actionFor } from "./transitions";
import type { GoalRung, RungStatus } from "@/lib/types/database";

const rung = (id: string, sort_order: number, status: RungStatus): GoalRung => ({
  id,
  goal_id: "g",
  sort_order,
  exercise_id: `ex_${id}`,
  target_sets: 3,
  target_reps: 5,
  target_reps_max: null,
  target_seconds: null,
  tempo: null,
  method: null,
  each_side: false,
  prescription_text: null,
  graduate_when: "",
  status,
  started_at: null,
  graduated_at: null,
});

describe("nextStatus", () => {
  it.each([
    ["locked", "start", "form"],
    ["form", "form_ok", "building"],
    ["building", "graduate", "maintaining"],
    ["maintaining", "reopen", "building"],
  ] as const)("%s + %s → %s", (from, action, to) => {
    expect(nextStatus(from, action)).toBe(to);
  });

  it("rejects invalid combinations", () => {
    expect(nextStatus("locked", "graduate")).toBeNull();
    expect(nextStatus("form", "start")).toBeNull();
    expect(nextStatus("maintaining", "graduate")).toBeNull();
  });

  it("actionFor gives the one valid action per status", () => {
    expect(actionFor("locked")).toBe("start");
    expect(actionFor("form")).toBe("form_ok");
    expect(actionFor("building")).toBe("graduate");
    expect(actionFor("maintaining")).toBe("reopen");
  });
});

describe("applyRungAction", () => {
  const now = "2026-09-26T10:00:00.000Z";

  it("start sets started_at", () => {
    const out = applyRungAction([rung("a", 0, "locked")], "a", "start", now);
    expect(out[0]).toMatchObject({ status: "form", started_at: now });
  });

  it("graduate promotes the next locked rung to form", () => {
    const rungs = [rung("a", 0, "building"), rung("b", 1, "locked"), rung("c", 2, "locked")];
    const out = applyRungAction(rungs, "a", "graduate", now);
    expect(out.map((r) => r.status)).toEqual(["maintaining", "form", "locked"]);
    expect(out[0].graduated_at).toBe(now);
    expect(out[1].started_at).toBe(now);
  });

  it("graduate with no locked rung left changes only the rung itself", () => {
    const rungs = [rung("a", 0, "maintaining"), rung("b", 1, "building")];
    const out = applyRungAction(rungs, "b", "graduate", now);
    expect(out.map((r) => r.status)).toEqual(["maintaining", "maintaining"]);
  });

  it("graduate skips rungs that are already active", () => {
    const rungs = [rung("a", 0, "building"), rung("b", 1, "form"), rung("c", 2, "locked")];
    const out = applyRungAction(rungs, "a", "graduate", now);
    expect(out.map((r) => r.status)).toEqual(["maintaining", "form", "form"]);
  });

  it("reopen clears graduated_at", () => {
    const r = { ...rung("a", 0, "maintaining"), graduated_at: now };
    const out = applyRungAction([r], "a", "reopen", now);
    expect(out[0]).toMatchObject({ status: "building", graduated_at: null });
  });

  it("returns the same rungs for an invalid action", () => {
    const rungs = [rung("a", 0, "locked")];
    expect(applyRungAction(rungs, "a", "graduate", now)).toEqual(rungs);
  });
});
