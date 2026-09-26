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
  /** Blocks done before the lifts (prep, and the goal block on pulling days). */
  before: Block[];
  /** Straight-set lifts, unchanged from the user's own days. */
  lifts: Item[];
  /** Blocks done after the lifts. */
  after: Block[];
}

const block = (
  section: BlockSection,
  items: Item[],
  opts: { rounds?: number; rest?: number | null; notes?: string | null } = {}
): Block => ({
  section,
  rounds_min: opts.rounds ?? 1,
  rounds_max: opts.rounds ?? 1,
  rest_seconds: opts.rest ?? null,
  notes: opts.notes ?? null,
  items,
});

// Jason's doses, straight from the programme, with his cues from the video notes.
const HANG = mm("mm_pronated_supinated_and_active_hang", {
  target_sets: 3,
  each_side: false,
  notes: "One set per grip: pronated, supinated, active. Passive first, let the shoulders open. Near-daily is the point.",
});
const RING_ROW = mm("mm_ring_row_progression", {
  target_sets: 1,
  notes: "Sub-maximal. Lock in the thumbs-to-chest touch every rep.",
});
const ACTIVE_ARCH = mm("mm_supinated_active_arch", {
  target_sets: 1,
  notes: "Chin-up model: from dead hang, unified pull from scapulae to hands.",
});
const BUTCHERS = mm("mm_butchers_block", {
  notes: "Hollow body, supinated hands, elbows shoulder-width. Load if you can.",
});
const CROSS_LEG = mm("mm_cross_leg_stretch_progression", {
  notes: "Hinge, then fold. Where it bites is where the work is.",
});
const PIKE = mm("mm_standing_and_seated_pike_stretching", {
  each_side: false,
  target_sets: 2,
  prescription_text: "60”+ standing, 60”+ seated, breathing to end-range",
  notes: "Active front-fold, not a slump.",
});
const BUTTERFLY = mm("mm_loaded_butterfly_contract_relax_method_1", {
  notes: "5-15 kg per knee. The load is a tool, not a target.",
});
const ELEVATED_PANCAKE = mm("mm_elevated_pancake_iso_unloaded", {
  notes: "Lowest elevation that keeps the back near-neutral, shoulders forward of hips.",
});
const COSSACK = mm("mm_cossack_squat", {
  target_sets: 1,
  notes: "Low-gait opener. Develop these before any hard pancake work.",
});
const NINETY = mm("mm_90_90_stretches_hip_up_switching_rocking", {
  target_seconds: 180,
  prescription_text: "3’ self-directed: reach, hip-up, switch, rock",
  notes: "Explore. Pause where you feel restriction.",
});

const HYBRIDS: Hybrid[] = [
  {
    name: "Daily practice · 10 min",
    description:
      "The stiffness fix. Spine, hangs, scaps and one hip position, near-daily, on its own. Short on purpose: do it every day rather than well once a week.",
    before: [
      block(
        "prep",
        [
          mm("mm_3_5_emptying_sequence", { target_seconds: 180, prescription_text: "3’ emptying sequence" }),
          HANG,
          mm("mm_scapular_function_coordination_all_4s_only", {
            target_reps: 8,
            target_reps_max: 10,
            prescription_text: "8-10x ea. movement/direction",
            notes: "Includes the spinal flexion, extension and circles on all fours.",
          }),
          NINETY,
        ],
        { notes: "One round, minimal rest. Swap the 90-90 for cross-leg or Cossack some days." }
      ),
    ],
    lifts: [],
    after: [],
  },
  {
    name: "Pull + Muscle-up",
    description:
      "Muscle-up work first while fresh (hangs at full dose, ring rows), then your Pull day minus the cable curl, then shoulders and hips.",
    before: [
      block("prep", [mm("mm_yuri_shoulder_mobility"), mm("mm_around_the_world")], {
        notes: "Shoulders and spine, ~4 min",
      }),
      block("main", [HANG, RING_ROW], { rounds: 2, rest: 60, notes: "Muscle-up foundations, before fatigue" }),
    ],
    lifts: [
      lift("Weighted Pull Ups", 3, 8, "Close grip lat pulldowns"),
      lift("Seated Cable Rows"),
      lift("Cable Rear Delt Fly", 3, 8, "One arm at a time, sat sideways on the seat"),
    ],
    after: [block("finishing", [BUTCHERS, CROSS_LEG])],
  },
  {
    name: "Upper body + Muscle-up",
    description:
      "Muscle-up work first (hangs at full dose, chin-up prep arch), then your Upper body day minus flyes and preacher curl, then shoulders and hips.",
    before: [
      block("prep", [mm("mm_basic_wrist_mobilization_1_0"), mm("mm_around_the_world")], {
        notes: "Wrists and spine, ~5 min",
      }),
      block("main", [HANG, ACTIVE_ARCH], { rounds: 2, rest: 60, notes: "Muscle-up foundations, before fatigue" }),
    ],
    lifts: [
      lift("Barbell Bench Press - Medium Grip"),
      lift("One-Arm Dumbbell Row"),
      lift("Barbell Shoulder Press"),
      lift("Wide-Grip Lat Pulldown"),
      lift("Low Cable Triceps Extension"),
    ],
    after: [block("finishing", [BUTCHERS, CROSS_LEG])],
  },
  {
    name: "Push + Shoulders",
    description:
      "Your Push day minus the dumbbell bench, with the thoracic and open-shoulder work pressing needs, and a pancake stretch to finish.",
    before: [
      block("prep", [mm("mm_basic_wrist_mobilization_1_0"), mm("mm_yuri_shoulder_mobility")], {
        notes: "Wrists and shoulders, ~5 min",
      }),
    ],
    lifts: [
      lift("Barbell Incline Bench Press - Medium Grip"),
      lift("Side Lateral Raise"),
      lift("Low Cable Triceps Extension"),
    ],
    after: [
      block("main", [mm("mm_wall_facing_thoracic_etx_squat_tuck"), BUTCHERS], {
        rounds: 2,
        notes: "Open-shoulder and upper-back range",
      }),
      block("finishing", [ELEVATED_PANCAKE]),
    ],
  },
  {
    name: "Legs + Pancake",
    description:
      "Cossack squats and 90-90 to open the hips, your Legs day minus leg extensions and calf raises, then the pancake work while the legs are warm.",
    before: [block("prep", [COSSACK, NINETY], { notes: "Hips, ~6 min" })],
    lifts: [
      lift("Barbell Full Squat"),
      lift("Barbell Hip Thrust", 3, 8, "Use the machine (next to squat racks)"),
      lift("Lying Leg Curls", 3, 8, "Nordics"),
    ],
    after: [
      block("main", [BUTTERFLY, ELEVATED_PANCAKE], { rounds: 2, notes: "Pancake range, breathe into it" }),
      block("finishing", [mm("mm_5_step_horse_stance_with_stick"), PIKE]),
    ],
  },
  {
    name: "Lower body + Hips",
    description:
      "Balance and knee-kiss to open, your Lower body day minus the leg press, then butterfly and cross-leg for the hips, pike and bridge to finish.",
    before: [
      block("prep", [mm("mm_slb_balance_variations_only", { target_sets: 1, target_seconds: 60, prescription_text: "60” ea. leg" }), mm("mm_elevated_knee_kiss", { target_sets: 1, target_seconds: 90, prescription_text: "90” practice" })], {
        notes: "Balance and hip extension, ~5 min",
      }),
    ],
    lifts: [
      lift("Romanian Deadlift"),
      lift("Split Squats"),
      lift("Lying Leg Curls"),
      lift("Standing Calf Raises"),
    ],
    after: [
      block("main", [BUTTERFLY, CROSS_LEG], { rounds: 2, notes: "Hip rotation and adductors" }),
      block("finishing", [PIKE, mm("mm_low_bridge_slide")]),
    ],
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

    const ordered = [...h.before, ...h.after];
    const labels = "ABCDEFGH";
    const { data: blockRows, error: bErr } = await supabase
      .from("workout_blocks")
      .insert(ordered.map((b, i) => ({
        workout_id: workoutId, label: labels[i], sort_order: i, section: b.section,
        rounds_min: b.rounds_min, rounds_max: b.rounds_max, rest_seconds: b.rest_seconds, notes: b.notes,
      })))
      .select("id, label");
    if (bErr || !blockRows) fail(`blocks ${h.name}`, bErr);
    const blockIdByLabel = new Map(blockRows.map((b) => [b.label, b.id]));

    const rows: Record<string, unknown>[] = [];
    let sort = 0;
    const push = (item: Item, label: string | null) =>
      rows.push({ workout_id: workoutId, exercise_id: idOf(item), sort_order: sort++, block_id: label ? blockIdByLabel.get(label) : null, ...item.rx });
    h.before.forEach((b, i) => b.items.forEach((it) => push(it, labels[i])));
    for (const it of h.lifts) push(it, null);
    h.after.forEach((b, i) => b.items.forEach((it) => push(it, labels[h.before.length + i])));

    const { error: eErr } = await supabase.from("workout_exercises").insert(rows);
    if (eErr) fail(`exercises ${h.name}`, eErr);
    console.log(`workout: ${h.name} — ${rows.length} exercises (${existing ? "replaced" : "created"})`);
  }
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
