"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ExerciseKind, ExerciseLink } from "@/lib/types/database";
import { slugify } from "@/lib/slug";
import { youtubeStart } from "@/lib/youtube";

export interface NewExerciseInput {
  name: string;
  kind: ExerciseKind;
  primary_muscles: string[];
  equipment: string | null;
  links: { label: string; url: string }[];
  notes: string | null;
}

const KINDS: ExerciseKind[] = ["strength", "mobility", "skill", "project"];

export async function createExercise(input: NewExerciseInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const name = input.name.trim();
  if (!name) return { error: "Name is required" };
  if (!KINDS.includes(input.kind)) return { error: "Invalid kind" };

  const slug = slugify(name);
  if (!slug) return { error: "Name needs at least one letter or number" };
  const id = `u_${slug}`;

  const links: ExerciseLink[] = input.links
    .map((l) => ({ label: l.label.trim() || "Demo", url: l.url.trim() }))
    .filter((l) => /^https?:\/\//.test(l.url))
    .map((l) => ({ ...l, start_seconds: youtubeStart(l.url) }));

  const { data: existing } = await supabase
    .from("exercises")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existing) return { error: "You already have an exercise with this name" };

  const { error } = await supabase.from("exercises").insert({
    id,
    name,
    force: null,
    level: "intermediate",
    mechanic: null,
    equipment: input.equipment || null,
    primary_muscles: input.primary_muscles,
    secondary_muscles: [],
    instructions: [],
    category: input.kind === "mobility" ? "stretching" : "strength",
    images: [],
    owner_id: user.id,
    kind: input.kind,
    source: "user",
    links,
    media: [],
    notes: input.notes?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/exercises");
  redirect(`/exercises/${id}`);
}
