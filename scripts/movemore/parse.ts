/**
 * Parse raw MoveMore extraction (data/movemore/<phase>.raw.json) into a
 * structured programme (data/movemore/<phase>.json).
 *
 * Run: npm run movemore:parse
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePrescription, type ParsedPrescription } from "../../src/lib/prescription";
import { slugify } from "../../src/lib/slug";
import { youtubeStart } from "../../src/lib/youtube";
import type { BlockSection, ExerciseKind, ExerciseLink } from "../../src/lib/types/database";

// ---------- raw input ----------

export interface RawLink {
  anchor: string;
  url: string;
}
export interface RawLine {
  kind: "heading" | "exercise" | "rounds" | "project" | "benchmark";
  text: string;
  label?: string;
  name?: string;
  prescription?: string;
  links: RawLink[];
}
export interface RawPage {
  page: number;
  title: "Projects" | "SSP" | "UBSM" | "LBC";
  lines: RawLine[];
}
export interface RawProgramme {
  phase: string;
  dates: string;
  pages: RawPage[];
}

// ---------- structured output ----------

export interface ProgrammeExercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  links: ExerciseLink[];
}
export interface ProgrammeBlockExercise extends ParsedPrescription {
  label: string;
  exercise_id: string;
  notes: string | null;
}
export interface ProgrammeBlock {
  label: string;
  section: BlockSection;
  rounds_min: number;
  rounds_max: number;
  rest_seconds: number | null;
  notes: string | null;
  exercises: ProgrammeBlockExercise[];
}
export interface ProgrammeRoutine {
  name: string;
  frequency: string | null;
  blocks: ProgrammeBlock[];
}
export interface ProgrammeBenchmark {
  name: string;
  exercise_id: string;
  target_seconds: number;
  each_side: boolean;
}
export interface Programme {
  phase: string;
  dates: string;
  exercises: ProgrammeExercise[];
  routines: ProgrammeRoutine[];
  benchmarks: ProgrammeBenchmark[];
}

// ---------- helpers ----------

export function parseRounds(text: string): Pick<ProgrammeBlock, "rounds_min" | "rounds_max" | "rest_seconds"> {
  const r = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*rounds?/i);
  const rounds_min = r ? parseInt(r[1], 10) : 1;
  const rounds_max = r?.[2] ? parseInt(r[2], 10) : rounds_min;
  const after = r ? text.slice((r.index ?? 0) + r[0].length) : text;
  const restPart = after.match(/rest/i) ? after : "";
  let rest_seconds: number | null = null;
  const sec = restPart.match(/(\d+)(?:\s*-\s*\d+)?\s*(?:”|"|″)/);
  const min = restPart.match(/(\d+)(?:\s*-\s*\d+)?\s*(?:’|'|′)/);
  if (sec) rest_seconds = parseInt(sec[1], 10);
  else if (min) rest_seconds = parseInt(min[1], 10) * 60;
  return { rounds_min, rounds_max, rest_seconds };
}

const STRENGTH_NAME =
  /pushup|row|squat|hang|dip|chinup|chin-up|bridge|calf|reach|hip-break|lunge|sissy|support|arch|plate|table|posting|raise|good-morning|SLRDL|walk|role|skipping/i;

function kindFor(name: string, prescription: string, fromProjects: boolean): ExerciseKind {
  if (fromProjects) return "project";
  if (STRENGTH_NAME.test(name) || /\[[0-9X]{4}\]/i.test(prescription)) return "strength";
  return "mobility";
}

function cleanAnchor(anchor: string): string {
  return anchor.replace(/^[\s,(]+|[\s,()\-]+$/g, "").trim();
}

function frequencyOf(heading: string): string | null {
  const m = heading.match(/(\d+(?:-\d+)?x per week)/i);
  return m ? m[1] : null;
}

function parentheticals(text: string): string | null {
  const found = text.match(/\(([^)]+)\)/g);
  if (!found) return null;
  const notes = found.map((s) => s.slice(1, -1).trim()).filter((s) => !/^alt\.?$/i.test(s));
  return notes.length ? notes.join("; ") : null;
}

// ---------- exercise registry ----------

class Registry {
  private map = new Map<string, ProgrammeExercise>();

  add(name: string, kind: ExerciseKind, rawLinks: RawLink[]): string {
    const id = `mm_${slugify(name)}`;
    const nameLower = name.toLowerCase();
    const links: ExerciseLink[] = [];
    let primaryTaken = false;
    for (const l of rawLinks) {
      const anchor = cleanAnchor(l.anchor);
      const inName = anchor.length > 0 && nameLower.includes(anchor.toLowerCase());
      const isPrimary = inName && !primaryTaken;
      if (isPrimary) primaryTaken = true;
      links.push({
        label: isPrimary ? "Demo" : anchor || "Link",
        url: l.url,
        start_seconds: youtubeStart(l.url),
      });
    }
    const existing = this.map.get(id);
    if (existing) {
      for (const l of links) {
        if (!existing.links.some((e) => e.url === l.url)) existing.links.push(l);
      }
    } else {
      this.map.set(id, { id, name, kind, links });
    }
    return id;
  }

  all(): ProgrammeExercise[] {
    return Array.from(this.map.values());
  }
}

// ---------- routine building ----------

function sectionFor(heading: string | null): BlockSection {
  if (!heading) return "main";
  if (/Prehabilitation/i.test(heading)) return "prep";
  if (/Auxiliary/i.test(heading)) return "auxiliary";
  return "main";
}

function buildBlocks(lines: RawLine[], registry: Registry, sectioned: boolean): ProgrammeBlock[] {
  const blocks: ProgrammeBlock[] = [];
  let current: ProgrammeBlock | null = null;
  let heading: string | null = null;

  for (const line of lines) {
    if (line.kind === "heading") {
      heading = line.text;
      continue;
    }
    if (line.kind === "exercise") {
      const letter = line.label![0];
      if (!current || current.label !== letter) {
        current = {
          label: letter,
          section: sectioned ? sectionFor(heading) : "main",
          rounds_min: 1,
          rounds_max: 1,
          rest_seconds: null,
          notes: null,
          exercises: [],
        };
        blocks.push(current);
      }
      const prescription = line.prescription ?? "";
      const id = registry.add(line.name!, kindFor(line.name!, prescription, false), line.links);
      current.exercises.push({
        label: line.label!,
        exercise_id: id,
        notes: parentheticals(prescription),
        ...parsePrescription(prescription),
      });
      continue;
    }
    if (line.kind === "rounds" && current) {
      Object.assign(current, parseRounds(line.text));
      current = null;
    }
  }

  // The last block under "Auxiliary & finishing" is the finishing block.
  const aux = blocks.filter((b) => b.section === "auxiliary");
  if (aux.length > 1) aux[aux.length - 1].section = "finishing";
  return blocks;
}

function sspRoutines(page: RawPage, registry: Registry): ProgrammeRoutine[] {
  const routines: ProgrammeRoutine[] = [];
  let currentName: string | null = null;
  let currentLines: RawLine[] = [];
  let currentFreq: string | null = null;

  const flush = () => {
    if (currentName) {
      routines.push({ name: currentName, frequency: currentFreq, blocks: buildBlocks(currentLines, registry, false) });
    }
    currentLines = [];
  };

  for (const line of page.lines) {
    if (line.kind === "heading" && /^SSP [AB]/.test(line.text)) {
      flush();
      currentName = line.text.match(/^(SSP [AB])/)![1];
      currentFreq = frequencyOf(line.text);
      continue;
    }
    currentLines.push(line);
  }
  flush();
  return routines;
}

function mainRoutine(page: RawPage, name: string, registry: Registry): ProgrammeRoutine {
  const heading = page.lines.find((l) => l.kind === "heading" && l.text.startsWith(name));
  // Bullet project placements duplicate the projects routine; skip them here.
  const lines = page.lines.filter((l) => l.kind !== "project");
  return { name, frequency: heading ? frequencyOf(heading.text) : null, blocks: buildBlocks(lines, registry, true) };
}

function projectsRoutine(page: RawPage, registry: Registry): { routine: ProgrammeRoutine; benchmarks: ProgrammeBenchmark[] } {
  const exercises: ProgrammeBlockExercise[] = [];
  let rounds = { rounds_min: 1, rounds_max: 1, rest_seconds: null as number | null };
  let minutes = 10;
  const benchmarks: ProgrammeBenchmark[] = [];

  for (const line of page.lines) {
    if (line.kind === "exercise") {
      const id = registry.add(line.name!, "project", line.links);
      exercises.push({
        label: line.label!,
        exercise_id: id,
        notes: null,
        ...parsePrescription(line.prescription ?? ""),
      });
    } else if (line.kind === "rounds") {
      rounds = parseRounds(line.text);
      const m = line.text.match(/(\d+)’\s*ea\./);
      if (m) minutes = parseInt(m[1], 10);
    } else if (line.kind === "benchmark") {
      const b = parseBenchmark(line, registry);
      if (b) benchmarks.push(b);
    }
  }
  for (const e of exercises) {
    e.target_seconds = minutes * 60;
    e.target_reps = null;
    e.target_reps_max = null;
  }
  return {
    routine: {
      name: "Movement Projects",
      frequency: null,
      blocks: [{ label: "A", section: "main", ...rounds, notes: null, exercises }],
    },
    benchmarks,
  };
}

function parseBenchmark(line: RawLine, registry: Registry): ProgrammeBenchmark | null {
  const m = line.name!.match(/^(\d+)\s*(”|"|″|’|'|′)\s*(.+)$/);
  if (!m) return null;
  const amount = parseInt(m[1], 10);
  const isMinutes = /[’'′]/.test(m[2]);
  const target_seconds = isMinutes ? amount * 60 : amount;
  const remainder = m[3].trim();
  const base = remainder.split(" (")[0].trim();
  const exerciseName = base.charAt(0).toUpperCase() + base.slice(1);
  const exercise_id = registry.add(exerciseName, "skill", line.links);
  return {
    name: `${amount}${isMinutes ? "min" : "s"} ${base}`,
    exercise_id,
    target_seconds,
    each_side: /each/i.test(remainder),
  };
}

export function parseProgramme(raw: RawProgramme): Programme {
  const registry = new Registry();
  const routines: ProgrammeRoutine[] = [];
  let benchmarks: ProgrammeBenchmark[] = [];

  const ssp = raw.pages.find((p) => p.title === "SSP");
  const ubsm = raw.pages.find((p) => p.title === "UBSM");
  const lbc = raw.pages.find((p) => p.title === "LBC");
  const projects = raw.pages.find((p) => p.title === "Projects");

  if (ssp) routines.push(...sspRoutines(ssp, registry));
  if (ubsm) routines.push(mainRoutine(ubsm, "Upper-body Strength & Mobility", registry));
  if (lbc) routines.push(mainRoutine(lbc, "Lower-body Complexity", registry));
  if (projects) {
    const { routine, benchmarks: b } = projectsRoutine(projects, registry);
    routines.push(routine);
    benchmarks = b;
  }

  return { phase: raw.phase, dates: raw.dates, exercises: registry.all(), routines, benchmarks };
}

// ---------- CLI ----------

function main() {
  for (const phase of ["B1P1", "B1P2"]) {
    const raw = JSON.parse(readFileSync(`data/movemore/${phase}.raw.json`, "utf-8")) as RawProgramme;
    const programme = parseProgramme(raw);
    writeFileSync(`data/movemore/${phase}.json`, JSON.stringify(programme, null, 2) + "\n");
    const blocks = programme.routines.reduce((n, r) => n + r.blocks.length, 0);
    console.log(
      `${phase}: ${programme.exercises.length} exercises, ${programme.routines.length} routines, ${blocks} blocks, ${programme.benchmarks.length} benchmarks`
    );
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
