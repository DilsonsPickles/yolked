import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const EXERCISES_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

interface RawExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

async function seed() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("Fetching exercises from Free Exercise DB...");
  const response = await fetch(EXERCISES_URL);
  if (!response.ok) {
    console.error(`Failed to fetch exercises: ${response.statusText}`);
    process.exit(1);
  }

  const exercises: RawExercise[] = await response.json();
  console.log(`Fetched ${exercises.length} exercises`);

  const mapped = exercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    force: ex.force,
    level: ex.level,
    mechanic: ex.mechanic,
    equipment: ex.equipment,
    primary_muscles: ex.primaryMuscles,
    secondary_muscles: ex.secondaryMuscles,
    instructions: ex.instructions,
    category: ex.category,
    images: ex.images.map((img) => `${IMAGE_BASE_URL}/${ex.id}/${img}`),
  }));

  // Batch upsert in chunks of 100
  const CHUNK_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
    const chunk = mapped.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("exercises")
      .upsert(chunk, { onConflict: "id" });

    if (error) {
      console.error(`Error inserting chunk at ${i}:`, error.message);
      process.exit(1);
    }

    inserted += chunk.length;
    console.log(`Inserted ${inserted}/${mapped.length} exercises`);
  }

  console.log("Seed complete!");
}

seed();
