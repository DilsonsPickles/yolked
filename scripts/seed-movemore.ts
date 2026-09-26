/**
 * Seed MoveMore exercises, workouts (with blocks) and goal ladders for one user.
 *
 * Run: SEED_USER_EMAIL=you@example.com npm run seed:movemore
 *
 * Re-runnable: exercises are upserted by id, workouts are matched by name and
 * their blocks/exercises replaced, goals are matched by name and their rungs
 * replaced (rung status is preserved when the exercise ids still match).
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

import { createClient } from "@supabase/supabase-js";
import type {
  Programme,
  ProgrammeExercise,
  ProgrammeRoutine,
} from "./movemore/parse";
import { GOALS, type LadderExercise, type LadderGoal } from "./movemore/ladders";
import type { ExerciseLink, GoalKind, RungStatus } from "../src/lib/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EMAIL = process.env.SEED_USER_EMAIL;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!EMAIL) {
  console.error("Set SEED_USER_EMAIL to the account that should own the seeded data");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
}

async function userIdForEmail(email: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) fail("listUsers", error);
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`No user with email ${email}`);
  return user.id;
}

// ---------- per-user exercise ids ----------

/**
 * Exercise ids are global. The first user to seed keeps the plain id
 * (mm_ring_row_progression); any later user gets their own copy with a
 * suffix, so nobody's ownership is overwritten and RLS keeps working.
 */
class IdMap {
  private map = new Map<string, string>();
  constructor(private userId: string) {}

  async resolve(id: string): Promise<string> {
    const cached = this.map.get(id);
    if (cached) return cached;
    const { data } = await supabase.from("exercises").select("owner_id").eq("id", id).maybeSingle();
    const mapped = data && data.owner_id && data.owner_id !== this.userId
      ? `${id}__${this.userId.slice(0, 8)}`
      : id;
    this.map.set(id, mapped);
    return mapped;
  }
}

// ---------- exercises ----------

function mergeExercises(programmes: Programme[]): ProgrammeExercise[] {
  const byId = new Map<string, ProgrammeExercise>();
  for (const p of programmes) {
    for (const e of p.exercises) {
      const existing = byId.get(e.id);
      if (!existing) {
        byId.set(e.id, { ...e, links: [...e.links] });
        continue;
      }
      for (const l of e.links) {
        if (!existing.links.some((x) => x.url === l.url)) existing.links.push(l);
      }
    }
  }
  return Array.from(byId.values());
}

async function upsertMoveMoreExercises(userId: string, ids: IdMap, exercises: ProgrammeExercise[]) {
  const rows = [];
  for (const e of exercises) rows.push({
    id: await ids.resolve(e.id),
    name: e.name,
    force: null,
    level: "intermediate",
    mechanic: null,
    equipment: null,
    primary_muscles: [] as string[],
    secondary_muscles: [] as string[],
    instructions: [] as string[],
    category: e.kind === "mobility" ? "stretching" : "strength",
    images: [] as string[],
    owner_id: userId,
    kind: e.kind,
    source: "movemore",
    links: e.links,
    notes: null,
  });
  const { error } = await supabase.from("exercises").upsert(rows, { onConflict: "id" });
  if (error) fail("upsert exercises", error);
  console.log(`exercises: ${rows.length} upserted`);
}

async function ensureUserExercise(userId: string, ids: IdMap, ex: LadderExercise) {
  if (!ex.name) return; // an mm_ exercise; already seeded
  const links: ExerciseLink[] = [];
  const { error } = await supabase.from("exercises").upsert(
    {
      id: await ids.resolve(ex.id),
      name: ex.name,
      force: null,
      level: "intermediate",
      mechanic: null,
      equipment: ex.equipment ?? null,
      primary_muscles: ex.muscles ?? [],
      secondary_muscles: [],
      instructions: [],
      category: ex.kind === "mobility" ? "stretching" : "strength",
      images: [],
      owner_id: userId,
      kind: ex.kind ?? "strength",
      source: "user",
      links,
      notes: null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (error) fail(`ensure exercise ${ex.id}`, error);
}

// ---------- workouts ----------

async function replaceWorkout(
  userId: string,
  ids: IdMap,
  name: string,
  description: string,
  routine: ProgrammeRoutine
) {
  const { data: existing, error: findError } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .is("deleted_at", null)
    .maybeSingle();
  if (findError) fail(`find workout ${name}`, findError);

  let workoutId: string;
  if (existing) {
    workoutId = existing.id;
    const { error: e1 } = await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
    if (e1) fail(`clear exercises ${name}`, e1);
    const { error: e2 } = await supabase.from("workout_blocks").delete().eq("workout_id", workoutId);
    if (e2) fail(`clear blocks ${name}`, e2);
    const { error: e3 } = await supabase
      .from("workouts")
      .update({ description, updated_at: new Date().toISOString() })
      .eq("id", workoutId);
    if (e3) fail(`update workout ${name}`, e3);
  } else {
    const { data, error } = await supabase
      .from("workouts")
      .insert({ user_id: userId, name, description })
      .select("id")
      .single();
    if (error || !data) fail(`insert workout ${name}`, error);
    workoutId = data.id;
  }

  const blockRows = routine.blocks.map((b, i) => ({
    workout_id: workoutId,
    label: b.label,
    sort_order: i,
    section: b.section,
    rounds_min: b.rounds_min,
    rounds_max: b.rounds_max,
    rest_seconds: b.rest_seconds,
    notes: b.notes,
  }));
  const { data: blocks, error: blockError } = await supabase
    .from("workout_blocks")
    .insert(blockRows)
    .select("id, label");
  if (blockError || !blocks) fail(`insert blocks ${name}`, blockError);
  const blockIdByLabel = new Map(blocks.map((b) => [b.label, b.id]));

  let sort = 0;
  const exerciseRows = [];
  for (const b of routine.blocks) for (const e of b.exercises) exerciseRows.push({
      workout_id: workoutId,
      exercise_id: await ids.resolve(e.exercise_id),
      sort_order: sort++,
      block_id: blockIdByLabel.get(b.label) ?? null,
      target_sets: e.target_sets,
      target_reps: e.target_reps,
      target_reps_max: e.target_reps_max,
      target_seconds: e.target_seconds,
      target_weight: null,
      tempo: e.tempo,
      method: e.method,
      each_side: e.each_side,
      prescription_text: e.prescription_text,
      notes: e.notes,
    });
  const { error: exError } = await supabase.from("workout_exercises").insert(exerciseRows);
  if (exError) fail(`insert exercises ${name}`, exError);
  console.log(
    `workout: ${name} — ${blockRows.length} blocks, ${exerciseRows.length} exercises (${existing ? "replaced" : "created"})`
  );
}

// ---------- goals ----------

interface GoalSpec {
  name: string;
  kind: GoalKind;
  description: string | null;
  pass_condition: string;
  benchmark_exercise_id: string | null;
  benchmark_target_seconds: number | null;
  sort_order: number;
  rungs: {
    exercise: LadderExercise;
    target_sets: number | null;
    target_reps: number | null;
    target_reps_max: number | null;
    target_seconds: number | null;
    tempo: string | null;
    method: string | null;
    each_side: boolean;
    prescription_text: string | null;
    graduate_when: string;
  }[];
}

function ladderToSpec(g: LadderGoal, sort_order: number): GoalSpec {
  return {
    name: g.name,
    kind: g.kind,
    description: g.description,
    pass_condition: g.pass_condition,
    benchmark_exercise_id: null,
    benchmark_target_seconds: null,
    sort_order,
    rungs: g.rungs.map((r) => ({
      exercise: r.exercise,
      target_sets: r.target_sets ?? null,
      target_reps: r.target_reps ?? null,
      target_reps_max: r.target_reps_max ?? null,
      target_seconds: r.target_seconds ?? null,
      tempo: r.tempo ?? null,
      method: r.method ?? null,
      each_side: r.each_side ?? false,
      prescription_text: r.prescription_text ?? null,
      graduate_when: r.graduate_when,
    })),
  };
}

function benchmarkSpecs(programme: Programme): GoalSpec[] {
  return programme.benchmarks.map((b, i) => {
    const seconds = b.target_seconds;
    const human = seconds >= 60 ? `${seconds / 60} min` : `${seconds} s`;
    return {
      name: b.name,
      kind: /hang|handstand/i.test(b.name) ? "strength" : "mobility",
      description: "MoveMore Zero Point benchmark. Submit a video when it becomes available.",
      pass_condition: `Hold for ${human}${b.each_side ? " each side" : ""}.`,
      benchmark_exercise_id: b.exercise_id,
      benchmark_target_seconds: seconds,
      sort_order: 10 + i,
      rungs: [],
    };
  });
}

async function seedGoal(userId: string, ids: IdMap, spec: GoalSpec) {
  for (const r of spec.rungs) await ensureUserExercise(userId, ids, r.exercise);
  const benchmarkId = spec.benchmark_exercise_id ? await ids.resolve(spec.benchmark_exercise_id) : null;

  const { data: existing, error: findError } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .eq("name", spec.name)
    .is("deleted_at", null)
    .maybeSingle();
  if (findError) fail(`find goal ${spec.name}`, findError);

  const fields = {
    user_id: userId,
    name: spec.name,
    kind: spec.kind,
    description: spec.description,
    pass_condition: spec.pass_condition,
    benchmark_exercise_id: benchmarkId,
    benchmark_target_seconds: spec.benchmark_target_seconds,
    benchmark_target_reps: null,
    sort_order: spec.sort_order,
  };

  let goalId: string;
  const previousStatus = new Map<string, { status: RungStatus; started_at: string | null; graduated_at: string | null }>();
  if (existing) {
    goalId = existing.id;
    const { data: oldRungs } = await supabase
      .from("goal_rungs")
      .select("exercise_id, status, started_at, graduated_at")
      .eq("goal_id", goalId);
    for (const r of oldRungs ?? []) previousStatus.set(r.exercise_id, r);
    const { error } = await supabase.from("goals").update(fields).eq("id", goalId);
    if (error) fail(`update goal ${spec.name}`, error);
    const { error: delError } = await supabase.from("goal_rungs").delete().eq("goal_id", goalId);
    if (delError) fail(`clear rungs ${spec.name}`, delError);
  } else {
    const { data, error } = await supabase.from("goals").insert(fields).select("id").single();
    if (error || !data) fail(`insert goal ${spec.name}`, error);
    goalId = data.id;
  }

  if (spec.rungs.length > 0) {
    const rows = [];
    for (let i = 0; i < spec.rungs.length; i++) {
      const r = spec.rungs[i];
      const exerciseId = await ids.resolve(r.exercise.id);
      const prev = previousStatus.get(exerciseId);
      const status: RungStatus = prev?.status ?? (i === 0 ? "form" : "locked");
      rows.push({
        goal_id: goalId,
        sort_order: i,
        exercise_id: exerciseId,
        target_sets: r.target_sets,
        target_reps: r.target_reps,
        target_reps_max: r.target_reps_max,
        target_seconds: r.target_seconds,
        tempo: r.tempo,
        method: r.method,
        each_side: r.each_side,
        prescription_text: r.prescription_text,
        graduate_when: r.graduate_when,
        status,
        started_at: prev?.started_at ?? (status !== "locked" ? new Date().toISOString() : null),
        graduated_at: prev?.graduated_at ?? null,
      });
    }
    const { error } = await supabase.from("goal_rungs").insert(rows);
    if (error) fail(`insert rungs ${spec.name}`, error);
  }
  console.log(`goal: ${spec.name} — ${spec.rungs.length} rungs (${existing ? "replaced" : "created"})`);
}

// ---------- main ----------

async function main() {
  const userId = await userIdForEmail(EMAIL!);
  const ids = new IdMap(userId);
  console.log(`seeding for ${EMAIL} (${userId})`);

  const programmes = ["B1P1", "B1P2"].map(
    (phase) => JSON.parse(readFileSync(`data/movemore/${phase}.json`, "utf-8")) as Programme
  );

  await upsertMoveMoreExercises(userId, ids, mergeExercises(programmes));

  let projectsDone = false;
  for (const p of programmes) {
    for (const routine of p.routines) {
      if (routine.name === "Movement Projects") {
        if (projectsDone) continue;
        projectsDone = true;
        await replaceWorkout(userId, ids, "Movement Projects", "MoveMore movement projects: 1-2 rounds of 10' each, or 2-4 rounds of 5' each.", routine);
        continue;
      }
      const freq = routine.frequency ? ` · ${routine.frequency}` : "";
      await replaceWorkout(userId, ids, `${p.phase} · ${routine.name}`, `MoveMore ${p.phase} (${p.dates})${freq}`, routine);
    }
  }

  const specs = [
    ...GOALS.map((g, i) => ladderToSpec(g, i)),
    ...benchmarkSpecs(programmes[0]),
  ];
  for (const spec of specs) await seedGoal(userId, ids, spec);

  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
