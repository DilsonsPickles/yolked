/**
 * Seed hybrid strength + mobility workouts: the user's existing lifting days
 * wrapped in MoveMore prep, goal-ladder work and finishing mobility.
 *
 * Run: SEED_USER_EMAIL=you@example.com npx tsx scripts/seed-hybrids.ts
 * Re-runnable: workouts are matched by name and replaced.
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

import { createClient } from "@supabase/supabase-js";
import type { Programme, ProgrammeBlockExercise } from "./movemore/parse";
import type { BlockSection, PrescriptionMethod } from "../src/lib/types/database";

const EMAIL = process.env.SEED_USER_EMAIL;
if (!EMAIL) {
  console.error("Set SEED_USER_EMAIL");
  process.exit(1);
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- prescription helpers ----------

interface Rx {
  target_sets: number;
  target_reps: number | null;
  target_reps_max: number | null;
  target_seconds: number | null;
  target_weight: number | null;
  tempo: string | null;
  method: PrescriptionMethod | null;
  each_side: boolean;
  prescription_text: string | null;
  notes: string | null;
}

const programmes = ["B1P1", "B1P2"].map(
  (p) => JSON.parse(readFileSync(`data/movemore/${p}.json`, "utf-8")) as Programme
);

/** Prescription for a MoveMore exercise as written in the programme (first occurrence). */
function mm(id: string, over: Partial<Rx> = {}): { id: string; rx: Rx } {
  for (const p of programmes) {
    for (const r of p.routines) {
      for (const b of r.blocks) {
        const e = b.exercises.find((x: ProgrammeBlockExercise) => x.exercise_id === id);
        if (e) {
          return {
            id,
            rx: {
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
              ...over,
            },
          };
        }
      }
    }
  }
  throw new Error(`MoveMore exercise not found in programmes: ${id}`);
}

/** A lift from the free-exercise-db seed, by exact name. */
function lift(name: string, sets = 3, reps = 8, notes: string | null = null): { name: string; rx: Rx } {
  return {
    name,
    rx: {
      target_sets: sets,
      target_reps: reps,
      target_reps_max: null,
      target_seconds: null,
      target_weight: null,
      tempo: null,
      method: null,
      each_side: false,
      prescription_text: null,
      notes,
    },
  };
}

/** An owned exercise by id with an explicit prescription. */
function own(id: string, rx: Partial<Rx>): { id: string; rx: Rx } {
  return {
    id,
    rx: {
      target_sets: 3,
      target_reps: null,
      target_reps_max: null,
      target_seconds: null,
      target_weight: null,
      tempo: null,
      method: null,
      each_side: false,
      prescription_text: null,
      notes: null,
      ...rx,
    },
  };
}

type Item = { id: string; rx: Rx } | { name: string; rx: Rx };

interface Block {
  label: string;
  section: BlockSection;
  rounds_min: number;
  rounds_max: number;
  rest_seconds: number | null;
  notes: string | null;
  items: Item[];
}

interface Hybrid {
  name: string;
  description: string;
  /** Straight-set lifts (no block), performed after the prep block. */
  lifts: Item[];
  prep: Block;
  goal: Block;
  finishing: Block;
}

const prep = (items: Item[], notes: string | null = null): Block => ({
  label: "A", section: "prep", rounds_min: 1, rounds_max: 1, rest_seconds: null, notes, items,
});
const goal = (items: Item[], rounds = 3, rest: number | null = 90, notes: string | null = null): Block => ({
  label: "B", section: "main", rounds_min: rounds, rounds_max: rounds, rest_seconds: rest, notes, items,
});
const finishing = (items: Item[]): Block => ({
  label: "C", section: "finishing", rounds_min: 1, rounds_max: 1, rest_seconds: null, notes: null, items,
});

// ---------- the workouts ----------

const HYBRIDS: Hybrid[] = [
  {
    name: "Pull + Muscle-up",
    description: "Your Pull day, minus the cable curl, with ~10 min of mobility: hangs and shoulders to open, ring rows + ring support for the muscle-up, thoracic and hips to finish.",
    prep: prep([
      mm("mm_pronated_supinated_and_active_hang", { target_seconds: 30, prescription_text: "30” each grip, relax into it" }),
      mm("mm_yuri_shoulder_mobility"),
    ], "5 min · loosen shoulders and lats"),
    lifts: [
      lift("Weighted Pull Ups", 3, 8, "Close grip lat pulldowns"),
      lift("Seated Cable Rows"),
      lift("Cable Rear Delt Fly", 3, 8, "One arm at a time, sat sideways on the seat"),
    ],
    goal: goal([
      mm("mm_ring_row_progression", { target_sets: 1, target_reps: 6, target_reps_max: 8, notes: "Muscle-up rung 2 · 1” thumbs-to-chest hold" }),
      own("mm_ring_support_assisted_or_full", { target_sets: 1, target_seconds: 15, method: "iso", prescription_text: "15” hold, turned out", notes: "Muscle-up rung 4" }),
    ], 2, 60, "Muscle-up ladder · 2 rounds"),
    finishing: finishing([
      mm("mm_butchers_block", { target_sets: 2, target_seconds: 20, prescription_text: "2x 20” holds" }),
      mm("mm_cross_leg_stretch_progression"),
    ]),
  },
  {
    name: "Push + Rings",
    description: "Your Push day, minus the dumbbell bench, with ~10 min of mobility: wrists and shoulders to open, ring dips + supinated arch for the muscle-up, thoracic and hips to finish.",
    prep: prep([
      mm("mm_basic_wrist_mobilization_1_0", { prescription_text: "2 min, the basics only" }),
      mm("mm_around_the_world"),
    ], "5 min · wrists and shoulders"),
    lifts: [
      lift("Barbell Incline Bench Press - Medium Grip"),
      lift("Side Lateral Raise"),
      lift("Low Cable Triceps Extension"),
    ],
    goal: goal([
      own("u_ring_dip", { target_sets: 1, target_reps: 5, prescription_text: "5x full depth, turn out at the top", notes: "Muscle-up rung 5" }),
      mm("mm_supinated_active_arch", { target_sets: 1, notes: "5x 3” top hold · false-grip prep" }),
    ], 2, 60, "Muscle-up ladder · 2 rounds"),
    finishing: finishing([
      mm("mm_wall_facing_thoracic_etx_squat_tuck", { target_sets: 1, target_seconds: 45, prescription_text: "45” practice" }),
      mm("mm_elevated_pancake_iso_unloaded", { notes: "Pancake maintenance" }),
    ]),
  },
  {
    name: "Legs + Pancake",
    description: "Your Legs day, minus calf raises (kept on Lower body), with ~10 min of mobility: Cossack squats and 90-90 to open the hips, butterfly + elevated pancake for the pancake goal, horse stance and pike to finish.",
    prep: prep([
      mm("mm_cossack_squat", { target_sets: 1, target_reps: 6, target_reps_max: 8, tempo: null, method: null, prescription_text: "6-8 ea. side, slow" }),
      mm("mm_90_90_stretches_hip_up_switching_rocking", { target_seconds: 120, prescription_text: "2 min self-directed" }),
    ], "5 min · hips"),
    lifts: [
      lift("Barbell Full Squat"),
      lift("Barbell Hip Thrust", 3, 8, "Use the machine (next to squat racks)"),
      lift("Lying Leg Curls", 3, 8, "Nordics"),
    ],
    goal: goal([
      mm("mm_loaded_butterfly_contract_relax_method_1", { notes: "Pancake rung 2" }),
      mm("mm_elevated_pancake_iso_unloaded", { notes: "Pancake rung 4" }),
    ], 2, null, "Pancake ladder · breathe into end range"),
    finishing: finishing([
      mm("mm_5_step_horse_stance_with_stick", { target_sets: 1, target_seconds: 45, prescription_text: "45” hold" }),
      mm("mm_standing_and_seated_pike_stretching", { target_sets: 1, target_seconds: 60, each_side: false, prescription_text: "60” seated pike, breathing" }),
    ]),
  },
  {
    name: "Lower body + Hips",
    description: "Your Lower body day, minus the leg press, with ~10 min of mobility: balance and knee-kiss to open, good-morning + top-loaded pancake for hinge range, pike and bridge to finish.",
    prep: prep([
      mm("mm_slb_balance_variations_only", { target_sets: 1, target_seconds: 45, prescription_text: "45” ea. leg" }),
      mm("mm_elevated_knee_kiss", { target_sets: 1, target_seconds: 60, prescription_text: "60” practice" }),
    ], "5 min · hamstrings and balance"),
    lifts: [
      lift("Romanian Deadlift"),
      lift("Split Squats"),
      lift("Lying Leg Curls"),
      lift("Standing Calf Raises"),
    ],
    goal: goal([
      mm("mm_unilateral_good_morning_cr_only", { target_sets: 1, target_seconds: 30, prescription_text: "30” CR ea. side", notes: "Pancake rung 5" }),
      mm("mm_elevated_top_loaded_pancake", { notes: "Pancake rung 6" }),
    ], 2, null, "Pancake ladder · deepest range"),
    finishing: finishing([
      mm("mm_standing_and_seated_pike_stretching", { target_sets: 1, target_seconds: 60, each_side: false, prescription_text: "60” seated pike, breathing" }),
      mm("mm_low_bridge_slide", { target_sets: 2, target_seconds: 20, prescription_text: "2x 20” holds" }),
    ]),
  },
  {
    name: "Upper body + Muscle-up",
    description: "Your Upper body day, minus flyes and preacher curl, with ~10 min of mobility: hangs and scap work to open, chin-up negatives + ring support for the muscle-up, shoulders and hips to finish.",
    prep: prep([
      mm("mm_pronated_supinated_and_active_hang", { target_seconds: 30, prescription_text: "30” each grip, relax into it" }),
      mm("mm_scapular_function_coordination_all_4s_only", { target_reps: 8, target_reps_max: null, prescription_text: "8x ea. direction" }),
    ], "5 min · shoulders and scaps"),
    lifts: [
      lift("Barbell Bench Press - Medium Grip"),
      lift("One-Arm Dumbbell Row"),
      lift("Barbell Shoulder Press"),
      lift("Wide-Grip Lat Pulldown"),
      lift("Low Cable Triceps Extension"),
    ],
    goal: goal([
      mm("mm_chinup_ecc_variation_bar_or_rings", { notes: "Muscle-up · slow negatives build the transition" }),
      own("mm_ring_support_assisted_or_full", { target_sets: 1, target_seconds: 15, method: "iso", prescription_text: "15” hold, turned out", notes: "Muscle-up rung 4" }),
    ], 2, 60, "Muscle-up ladder · 2 rounds"),
    finishing: finishing([
      mm("mm_butchers_block", { target_sets: 2, target_seconds: 20, prescription_text: "2x 20” holds" }),
      mm("mm_cross_leg_stretch_progression"),
    ]),
  },
];

// ---------- seeding ----------

function fail(ctx: string, e: { message: string } | null): never {
  throw new Error(`${ctx}: ${e?.message ?? "unknown"}`);
}

async function main() {
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (uErr) fail("listUsers", uErr);
  const user = users.users.find((u) => u.email?.toLowerCase() === EMAIL!.toLowerCase());
  if (!user) throw new Error(`No user ${EMAIL}`);
  const userId = user.id;
  console.log(`seeding hybrids for ${EMAIL}`);

  // Resolve exercise ids: owned ids may carry a per-user suffix; lifts are looked up by name.
  const { data: owned } = await supabase.from("exercises").select("id").eq("owner_id", userId);
  const ownedIds = new Set((owned ?? []).map((e) => e.id));
  const resolveOwned = (id: string) => {
    if (ownedIds.has(id)) return id;
    const suffixed = `${id}__${userId.slice(0, 8)}`;
    if (ownedIds.has(suffixed)) return suffixed;
    throw new Error(`Owned exercise not found for this user: ${id} (run seed:movemore first)`);
  };
  const liftIdByName = new Map<string, string>();
  const liftNames = Array.from(new Set(HYBRIDS.flatMap((h) => h.lifts.map((l) => ("name" in l ? l.name : "")))));
  const { data: lifts } = await supabase.from("exercises").select("id, name").in("name", liftNames).is("owner_id", null);
  for (const l of lifts ?? []) liftIdByName.set(l.name, l.id);
  for (const n of liftNames) if (!liftIdByName.get(n)) throw new Error(`Lift not found in library: ${n}`);

  const idOf = (item: Item) => ("id" in item ? resolveOwned(item.id) : liftIdByName.get(item.name)!);

  for (const h of HYBRIDS) {
    const { data: existing } = await supabase
      .from("workouts").select("id").eq("user_id", userId).eq("name", h.name).is("deleted_at", null).maybeSingle();
    let workoutId: string;
    if (existing) {
      workoutId = existing.id;
      await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
      await supabase.from("workout_blocks").delete().eq("workout_id", workoutId);
      await supabase.from("workouts").update({ description: h.description, updated_at: new Date().toISOString() }).eq("id", workoutId);
    } else {
      const { data, error } = await supabase.from("workouts").insert({ user_id: userId, name: h.name, description: h.description }).select("id").single();
      if (error || !data) fail(`insert ${h.name}`, error);
      workoutId = data.id;
    }

    const blocks = [h.prep, h.goal, h.finishing];
    const { data: blockRows, error: bErr } = await supabase
      .from("workout_blocks")
      .insert(blocks.map((b, i) => ({
        workout_id: workoutId, label: b.label, sort_order: i, section: b.section,
        rounds_min: b.rounds_min, rounds_max: b.rounds_max, rest_seconds: b.rest_seconds, notes: b.notes,
      })))
      .select("id, label");
    if (bErr || !blockRows) fail(`blocks ${h.name}`, bErr);
    const blockId = new Map(blockRows.map((b) => [b.label, b.id]));

    // Order: prep block → lifts (straight sets) → goal block → finishing block
    const rows: Record<string, unknown>[] = [];
    let sort = 0;
    const push = (item: Item, block: string | null) =>
      rows.push({ workout_id: workoutId, exercise_id: idOf(item), sort_order: sort++, block_id: block ? blockId.get(block) : null, ...item.rx });
    for (const it of h.prep.items) push(it, "A");
    for (const it of h.lifts) push(it, null);
    for (const it of h.goal.items) push(it, "B");
    for (const it of h.finishing.items) push(it, "C");

    const { error: eErr } = await supabase.from("workout_exercises").insert(rows);
    if (eErr) fail(`exercises ${h.name}`, eErr);
    console.log(`workout: ${h.name} — ${rows.length} exercises (${existing ? "replaced" : "created"})`);
  }
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
