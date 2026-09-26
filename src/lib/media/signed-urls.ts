import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExerciseMedia } from "@/lib/types/database";

export const MEDIA_BUCKET = "exercise-media";
const SIGNED_URL_TTL_SECONDS = 3600;

export interface SignedMedia extends ExerciseMedia {
  url: string;
}

/**
 * Create short-lived signed URLs for private exercise media. Server side only.
 * Returns an empty list on any error so a missing clip never blocks a page.
 */
export async function signMedia(
  supabase: SupabaseClient,
  media: ExerciseMedia[]
): Promise<SignedMedia[]> {
  if (!media || media.length === 0) return [];
  try {
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(
        media.map((m) => m.path),
        SIGNED_URL_TTL_SECONDS
      );
    if (error || !data) return [];
    const urlByPath = new Map(
      data.filter((d) => d.signedUrl && !d.error).map((d) => [d.path, d.signedUrl])
    );
    return media
      .filter((m) => urlByPath.has(m.path))
      .map((m) => ({ ...m, url: urlByPath.get(m.path)! }));
  } catch {
    return [];
  }
}

/** Sign media for many exercises at once; returns a map keyed by exercise id. */
export async function signMediaByExercise(
  supabase: SupabaseClient,
  exercises: { id: string; media: ExerciseMedia[] }[]
): Promise<Record<string, SignedMedia[]>> {
  const out: Record<string, SignedMedia[]> = {};
  const withMedia = exercises.filter((e) => e.media && e.media.length > 0);
  if (withMedia.length === 0) return out;

  const all = withMedia.flatMap((e) => e.media.map((m) => ({ ...m, exerciseId: e.id })));
  const signed = await signMedia(supabase, all);
  const byPath = new Map(signed.map((s) => [s.path, s.url]));

  for (const e of withMedia) {
    out[e.id] = e.media
      .filter((m) => byPath.has(m.path))
      .map((m) => ({ ...m, url: byPath.get(m.path)! }));
  }
  return out;
}
