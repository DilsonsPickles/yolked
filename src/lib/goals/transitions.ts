import type { GoalRung, RungStatus } from "@/lib/types/database";

export type RungAction = "start" | "form_ok" | "graduate" | "reopen";

const TRANSITIONS: Record<RungStatus, Partial<Record<RungAction, RungStatus>>> = {
  locked: { start: "form" },
  form: { form_ok: "building" },
  building: { graduate: "maintaining" },
  maintaining: { reopen: "building" },
};

export const ACTION_LABEL: Record<RungAction, string> = {
  start: "Start",
  form_ok: "Form OK",
  graduate: "Graduate",
  reopen: "Reopen",
};

export const STATUS_LABEL: Record<RungStatus, string> = {
  locked: "Locked",
  form: "Learning form",
  building: "Building",
  maintaining: "Maintaining",
};

export function nextStatus(current: RungStatus, action: RungAction): RungStatus | null {
  return TRANSITIONS[current][action] ?? null;
}

/** The single action that is valid from a status. */
export function actionFor(status: RungStatus): RungAction {
  return Object.keys(TRANSITIONS[status])[0] as RungAction;
}

/**
 * Apply an action to one rung. Graduating also promotes the next locked rung
 * (by sort order) to "form". Pure: returns a new array, or the input array
 * unchanged when the action is not valid.
 */
export function applyRungAction(
  rungs: GoalRung[],
  rungId: string,
  action: RungAction,
  now: string
): GoalRung[] {
  const target = rungs.find((r) => r.id === rungId);
  if (!target) return rungs;
  const status = nextStatus(target.status, action);
  if (!status) return rungs;

  const updated = rungs.map((r) => {
    if (r.id !== rungId) return r;
    const changes: Partial<GoalRung> = { status };
    if (action === "start") changes.started_at = now;
    if (action === "graduate") changes.graduated_at = now;
    if (action === "reopen") changes.graduated_at = null;
    return { ...r, ...changes };
  });

  if (action !== "graduate") return updated;

  const nextLocked = [...updated]
    .sort((a, b) => a.sort_order - b.sort_order)
    .find((r) => r.sort_order > target.sort_order && r.status === "locked");
  if (!nextLocked) return updated;

  return updated.map((r) =>
    r.id === nextLocked.id ? { ...r, status: "form" as const, started_at: now } : r
  );
}

/** Rungs that differ between two arrays (by id), for minimal writes. */
export function changedRungs(before: GoalRung[], after: GoalRung[]): GoalRung[] {
  const prev = new Map(before.map((r) => [r.id, r]));
  return after.filter((r) => {
    const b = prev.get(r.id);
    return (
      !b ||
      b.status !== r.status ||
      b.started_at !== r.started_at ||
      b.graduated_at !== r.graduated_at
    );
  });
}
