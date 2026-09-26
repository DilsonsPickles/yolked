/**
 * Upload media-out/** to the private `exercise-media` bucket and record each
 * file on its exercise (exercises.media). Idempotent by storage path.
 *
 * Run: SEED_USER_EMAIL=you@example.com npm run media:upload
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

import { createClient } from "@supabase/supabase-js";
import type { ExerciseMedia } from "../../src/lib/types/database";
import type { Programme } from "../movemore/parse";
import { OWN_RECORDINGS } from "./own-recordings";
import { slugify } from "../../src/lib/slug";
import { basename, extname } from "node:path";

const OUT = "media-out";
const BUCKET = "exercise-media";
const EMAIL = process.env.SEED_USER_EMAIL;

if (!EMAIL) {
  console.error("Set SEED_USER_EMAIL to the account that owns the exercises");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function userIdForEmail(email: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`No user with email ${email}`);
  return user.id;
}

/** Label for a produced file: link label for YouTube clips, mapping label for own/GIF files. */
function labelFor(exerciseId: string, file: string, programme: Programme): { kind: "clip" | "own"; label: string } {
  const own = OWN_RECORDINGS.find((r) => {
    const prefix = r.kind === "own" ? "own_" : "clip_";
    return r.exercise_id === exerciseId && file === `${prefix}${slugify(basename(r.file, extname(r.file)))}.mp4`;
  });
  if (own) return { kind: own.kind, label: own.label };

  const m = file.match(/^(.+)_(\d+)\.mp4$/);
  const ex = programme.exercises.find((e) => e.id === exerciseId);
  if (m && ex) {
    const link = ex.links.find(
      (l) => l.url.includes(m[1]) && (l.start_seconds ?? 0) === parseInt(m[2], 10)
    );
    if (link) return { kind: "clip", label: link.label };
  }
  return { kind: "clip", label: "Clip" };
}

async function main() {
  const userId = await userIdForEmail(EMAIL!);
  const programme = JSON.parse(readFileSync(join(OUT, ".programme.json"), "utf-8")) as Programme;
  const exerciseDirs = readdirSync(OUT).filter((d) => statSync(join(OUT, d)).isDirectory());
  console.log(`uploading for ${EMAIL}: ${exerciseDirs.length} exercises`);

  let uploaded = 0, failed = 0;
  for (const exerciseId of exerciseDirs) {
    const files = readdirSync(join(OUT, exerciseId)).filter((f) => f.endsWith(".mp4"));
    if (files.length === 0) continue;

    const { data: exercise, error: exError } = await supabase
      .from("exercises")
      .select("id, media")
      .eq("id", exerciseId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (exError || !exercise) {
      console.log(`  SKIP ${exerciseId}: not an owned exercise (${exError?.message ?? "not found"})`);
      failed += files.length;
      continue;
    }

    const media: ExerciseMedia[] = [...((exercise.media as ExerciseMedia[]) ?? [])];
    for (const file of files) {
      const path = `${userId}/${exerciseId}/${file}`;
      const body = readFileSync(join(OUT, exerciseId, file));
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, body, { contentType: "video/mp4", upsert: true });
      if (error) {
        console.log(`  FAIL ${path}: ${error.message}`);
        failed++;
        continue;
      }
      uploaded++;
      const meta = labelFor(exerciseId, file, programme);
      const idx = media.findIndex((m) => m.path === path);
      const entry: ExerciseMedia = { path, kind: meta.kind, label: meta.label };
      if (idx >= 0) media[idx] = entry;
      else media.push(entry);
    }

    // Own recordings first, then clips, stable by label
    media.sort((a, b) => (a.kind === b.kind ? a.label.localeCompare(b.label) : a.kind === "own" ? -1 : 1));
    const { error: updError } = await supabase.from("exercises").update({ media }).eq("id", exerciseId);
    if (updError) console.log(`  FAIL update ${exerciseId}: ${updError.message}`);
    else console.log(`  ok   ${exerciseId}: ${media.length} media entries`);
  }
  console.log(`done: ${uploaded} uploaded, ${failed} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
