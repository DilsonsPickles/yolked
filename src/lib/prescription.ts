import type { Prescription, PrescriptionMethod } from "@/lib/types/database";

/**
 * Parsing and formatting of MoveMore-style prescriptions such as
 *   6-8x [3012] 1” TTC hold          → 6-8 reps, tempo 3012, iso
 *   2x 45-60” hold (minimal rest)    → 2 sets of 45 s
 *   DS: 20”, 15”, 10” holds          → 3 descending holds, 20 s first
 * Everything is kept verbatim in `prescription_text`; the structured fields
 * are best-effort and may stay null when the text has no numbers.
 */
export type ParsedPrescription = Omit<Prescription, "target_weight">;

const SEC = /(\d+)(?:\s*-\s*(\d+))?\s*(?:”|"|″)/;
const MIN = /(\d+)(?:\s*-\s*(\d+))?\s*(?:’|'|′)/;
const REPS = /(\d+)(?:\s*-\s*(\d+))?\s*x\b/i;
/** Leading "2-3x " followed by a number: the first number is a set count. */
const SETS_X = /^(\d+)(?:\s*-\s*(\d+))?\s*x\s+(?=\d)/i;
const TEMPO = /\[[0-9X]{4}\]/i;
const LIST = /(?:DS|DeR):\s*((?:\d+(?:\s*-\s*\d+)?\s*(?:”|"|″|x)\s*,?\s*)+)/i;
const LIST_ITEM = /\d+(?:\s*-\s*\d+)?\s*(?:”|"|″|x)/gi;

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function detectMethod(text: string): PrescriptionMethod | null {
  const lower = text.toLowerCase();
  if (/\bds:/i.test(text)) return "ds";
  if (/\bder:/i.test(text)) return "der";
  if (/\bcr\b/i.test(text)) return "cr";
  if (/accu\./.test(lower)) return "accu";
  if (/pulse/.test(lower)) return "pulse";
  if (/\bsd\b/.test(lower)) return "sd";
  if (/no iso/.test(lower)) return null;
  if (/iso\.|\biso\b|hold/.test(lower)) return "iso";
  return null;
}

function detectEachSide(text: string): boolean {
  const lower = text.toLowerCase();
  if (/each side|both sides/.test(lower)) return true;
  // "ea." means each side / leg / direction, except "ea. rep"
  return /\bea\.?(?!\s*rep\b)/.test(lower);
}

export function parsePrescription(raw: string): ParsedPrescription {
  const text = normalise(raw);
  let rest = text;
  let target_sets = 1;

  // Leading "NxM" pattern: first number = sets, keep parsing the remainder.
  const setsMatch = rest.match(SETS_X);
  if (setsMatch) {
    target_sets = parseInt(setsMatch[1], 10);
    rest = rest.slice(setsMatch[0].length);
  }

  // Drop set / descending list: the number of listed values is the set count.
  const list = rest.match(LIST);
  if (list) {
    const items = list[1].match(LIST_ITEM) ?? [];
    if (items.length > 1) target_sets = items.length;
  }

  const tempo = text.match(TEMPO)?.[0] ?? null;
  const reps = rest.match(REPS);
  const sec = rest.match(SEC);
  const min = rest.match(MIN);

  // Whichever numeric token comes first decides the mode.
  const repsIdx = reps?.index ?? Infinity;
  const timeIdx = Math.min(sec?.index ?? Infinity, min?.index ?? Infinity);

  let target_reps: number | null = null;
  let target_reps_max: number | null = null;
  let target_seconds: number | null = null;

  if (reps && repsIdx < timeIdx) {
    target_reps = parseInt(reps[1], 10);
    target_reps_max = reps[2] ? parseInt(reps[2], 10) : null;
  } else if (sec && (sec.index ?? Infinity) <= (min?.index ?? Infinity)) {
    target_seconds = parseInt(sec[1], 10);
  } else if (min) {
    target_seconds = parseInt(min[1], 10) * 60;
  }

  return {
    target_sets,
    target_reps,
    target_reps_max,
    target_seconds,
    tempo,
    method: detectMethod(text),
    each_side: detectEachSide(text),
    prescription_text: text,
  };
}

const METHOD_LABEL: Record<PrescriptionMethod, string> = {
  iso: "iso",
  cr: "CR",
  ds: "DS",
  accu: "accu.",
  pulse: "pulses",
  der: "DeR",
  sd: "SD",
};

/** One-line human summary, e.g. "3 × 6-8 [3011]" or "2 × 30s CR ea." */
export function formatPrescription(p: Partial<Prescription>): string {
  const sets = p.target_sets ?? 1;
  const parts: string[] = [];

  if (p.target_reps != null) {
    const reps = `${p.target_reps}${p.target_reps_max ? `-${p.target_reps_max}` : ""}`;
    parts.push(sets > 1 ? `${sets} × ${reps}` : `${reps} reps`);
  } else if (p.target_seconds != null) {
    const secs = `${p.target_seconds}s`;
    parts.push(sets > 1 ? `${sets} × ${secs}` : secs);
  } else {
    return p.prescription_text ?? (sets > 1 ? `${sets} sets` : "");
  }

  if (p.tempo) parts.push(p.tempo);
  if (p.method && p.method !== "iso") parts.push(METHOD_LABEL[p.method]);
  if (p.each_side) parts.push("ea.");
  return parts.join(" ");
}
