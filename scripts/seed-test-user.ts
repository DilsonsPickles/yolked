/**
 * Seed script: creates a test user with 6 months of workout history.
 * Run: npx tsx scripts/seed-test-user.ts
 */

import { readFileSync } from "fs";
// Load .env.local manually
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAIL = "testuser@yolked.dev";
const TEST_PASSWORD = "TestPassword123!";

// Exercises we'll look up by name
const EXERCISE_NAMES = [
  "Barbell Bench Press - Medium Grip",
  "Barbell Deadlift",
  "Barbell Full Squat",
  "Overhead Press",
  "Barbell Curl",
];

// Starting weights and weekly progression (kg)
const EXERCISE_CONFIG: Record<string, { startWeight: number; weeklyGain: number; reps: number }> = {
  "Barbell Bench Press - Medium Grip": { startWeight: 60, weeklyGain: 1.0, reps: 8 },
  "Barbell Deadlift": { startWeight: 80, weeklyGain: 1.5, reps: 5 },
  "Barbell Full Squat": { startWeight: 70, weeklyGain: 1.25, reps: 6 },
  "Overhead Press": { startWeight: 35, weeklyGain: 0.5, reps: 8 },
  "Barbell Curl": { startWeight: 25, weeklyGain: 0.5, reps: 10 },
};

async function main() {
  console.log("Looking up exercises...");

  const { data: exercises, error: exErr } = await supabase
    .from("exercises")
    .select("id, name")
    .in("name", EXERCISE_NAMES);

  if (exErr) throw exErr;
  if (!exercises || exercises.length === 0) {
    // Try partial matching
    console.log("Exact match failed, trying partial match...");
    const { data: allEx } = await supabase
      .from("exercises")
      .select("id, name")
      .limit(500);

    const found = (allEx || []).filter((e) =>
      EXERCISE_NAMES.some((n) => e.name.toLowerCase().includes(n.toLowerCase().split(" ")[1]))
    );
    if (found.length === 0) {
      // Just grab 5 exercises
      const { data: fallback } = await supabase.from("exercises").select("id, name").limit(5);
      if (!fallback || fallback.length === 0) throw new Error("No exercises found in database");
      exercises!.push(...fallback);
    } else {
      exercises!.push(...found.slice(0, 5));
    }
  }

  const exerciseMap = new Map(exercises!.map((e) => [e.name, e.id]));
  console.log(`Found ${exerciseMap.size} exercises:`, [...exerciseMap.keys()]);

  // Create test user
  console.log(`Creating test user: ${TEST_EMAIL}`);
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (authErr) {
    if (authErr.message.includes("already been registered")) {
      console.log("User already exists, looking up...");
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users?.users.find((u) => u.email === TEST_EMAIL);
      if (!existing) throw new Error("Could not find existing test user");
      var userId = existing.id;
    } else {
      throw authErr;
    }
  } else {
    var userId = authData.user.id;
  }

  console.log(`User ID: ${userId}`);

  // Create a workout template
  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .insert({ user_id: userId, name: "Push Pull Legs", description: "Full body compound lifts" })
    .select("id")
    .single();

  if (wErr) throw wErr;
  console.log(`Created workout: ${workout.id}`);

  // Add exercises to workout
  const exerciseEntries = [...exerciseMap.entries()];
  const workoutExercises = exerciseEntries.map(([name, exId], i) => ({
    workout_id: workout.id,
    exercise_id: exId,
    sort_order: i,
    target_sets: 3,
    target_reps: EXERCISE_CONFIG[name]?.reps ?? 8,
    target_weight: EXERCISE_CONFIG[name]?.startWeight ?? 40,
  }));

  const { error: weErr } = await supabase.from("workout_exercises").insert(workoutExercises);
  if (weErr) throw weErr;

  // Generate 6 months of sessions (3x per week)
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const sessions: { workout_id: string; user_id: string; started_at: string; completed_at: string }[] = [];
  const current = new Date(sixMonthsAgo);

  while (current <= now) {
    const dayOfWeek = current.getDay();
    // Train Mon(1), Wed(3), Fri(5)
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      const started = new Date(current);
      started.setHours(7, 0, 0, 0);
      const completed = new Date(started);
      completed.setMinutes(started.getMinutes() + 45 + Math.floor(Math.random() * 30));

      sessions.push({
        workout_id: workout.id,
        user_id: userId,
        started_at: started.toISOString(),
        completed_at: completed.toISOString(),
      });
    }
    current.setDate(current.getDate() + 1);
  }

  console.log(`Creating ${sessions.length} sessions...`);

  // Insert sessions in batches
  const BATCH = 50;
  const sessionIds: string[] = [];

  for (let i = 0; i < sessions.length; i += BATCH) {
    const batch = sessions.slice(i, i + BATCH);
    const { data: inserted, error: sErr } = await supabase
      .from("workout_sessions")
      .insert(batch)
      .select("id, started_at");

    if (sErr) throw sErr;
    for (const s of inserted!) {
      sessionIds.push(s.id);
    }
  }

  // Generate sets for each session with progressive overload
  console.log("Creating session sets with progressive weights...");

  const allSets: {
    session_id: string;
    exercise_id: string;
    set_number: number;
    reps_completed: number;
    weight_used: number;
    completed: boolean;
    completed_at: string;
  }[] = [];

  for (let si = 0; si < sessionIds.length; si++) {
    const sessionId = sessionIds[si];
    const weekNumber = Math.floor(si / 3); // ~3 sessions per week
    const sessionTime = sessions[si].completed_at;

    for (const [name, exId] of exerciseEntries) {
      const config = EXERCISE_CONFIG[name] ?? { startWeight: 40, weeklyGain: 0.5, reps: 8 };
      const baseWeight = config.startWeight + weekNumber * config.weeklyGain;

      for (let setNum = 1; setNum <= 3; setNum++) {
        // Add some variance: slight drop on later sets, random ±2kg
        const variance = (Math.random() - 0.5) * 4;
        const setDrop = (setNum - 1) * 2.5;
        const weight = Math.round((baseWeight - setDrop + variance) * 2) / 2; // round to 0.5

        // Reps may drop slightly on heavier/later sets
        const reps = Math.max(config.reps - (setNum - 1), Math.floor(config.reps * 0.7));

        allSets.push({
          session_id: sessionId,
          exercise_id: exId,
          set_number: setNum,
          reps_completed: reps,
          weight_used: Math.max(weight, 5),
          completed: true,
          completed_at: sessionTime,
        });
      }
    }
  }

  console.log(`Inserting ${allSets.length} sets...`);

  for (let i = 0; i < allSets.length; i += 500) {
    const batch = allSets.slice(i, i + 500);
    const { error: setErr } = await supabase.from("session_sets").insert(batch);
    if (setErr) throw setErr;
    process.stdout.write(`  ${Math.min(i + 500, allSets.length)}/${allSets.length}\r`);
  }

  console.log("\n\nDone! Test account created:");
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  Sessions: ${sessions.length}`);
  console.log(`  Sets:     ${allSets.length}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
