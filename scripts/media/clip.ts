/**
 * Produce short reference clips for every MoveMore exercise link, plus
 * re-encoded copies of the owner's own recordings.
 *
 * Run: npm run media:clip            (all)
 *      npm run media:clip -- --own   (own recordings only)
 *      npm run media:clip -- --yt    (YouTube clips only)
 *
 * Requires: brew install yt-dlp ffmpeg
 *
 * Output: media-out/<exercise_id>/<file>.mp4 (gitignored). Existing outputs
 * are skipped, so the script is safe to re-run. Downloads are cached in
 * media-cache/ keyed by video id and start time.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, copyFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { Programme } from "../movemore/parse";
import { isYoutube, youtubeId } from "../../src/lib/youtube";
import { slugify } from "../../src/lib/slug";
import { OWN_RECORDINGS } from "./own-recordings";

const OUT = "media-out";
const CACHE = "media-cache";
const CLIP_SECONDS = 45;

interface Job {
  exerciseId: string;
  videoId: string;
  start: number;
  label: string;
}

function run(cmd: string, args: string[]): { ok: boolean; stderr: string } {
  try {
    execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, stderr: "" };
  } catch (err) {
    const e = err as { stderr?: Buffer; message?: string };
    return { ok: false, stderr: (e.stderr?.toString() || e.message || "").trim() };
  }
}

function firstLine(text: string): string {
  const lines = text.split("\n").filter((l) => /error/i.test(l));
  return (lines[lines.length - 1] ?? text.split("\n").pop() ?? "").slice(0, 160);
}

function collectJobs(): Job[] {
  const jobs = new Map<string, Job>();
  for (const phase of ["B1P1", "B1P2"]) {
    const programme = JSON.parse(readFileSync(`data/movemore/${phase}.json`, "utf-8")) as Programme;
    for (const ex of programme.exercises) {
      for (const link of ex.links) {
        if (!isYoutube(link.url)) continue;
        const videoId = youtubeId(link.url);
        if (!videoId) continue;
        const start = link.start_seconds ?? 0;
        const key = `${ex.id}:${videoId}:${start}`;
        if (!jobs.has(key)) jobs.set(key, { exerciseId: ex.id, videoId, start, label: link.label });
      }
    }
  }
  return Array.from(jobs.values());
}

function downloadSection(videoId: string, start: number): string | null {
  mkdirSync(CACHE, { recursive: true });
  const cached = readdirSync(CACHE).find((f) => f.startsWith(`${videoId}_${start}.`));
  if (cached) return join(CACHE, cached);

  const template = join(CACHE, `${videoId}_${start}.%(ext)s`);
  // The mobile-web player client serves plain https streams that ffmpeg can
  // read for section downloads; other clients currently return 503s.
  const result = run("yt-dlp", [
    "--quiet",
    "--no-warnings",
    "--extractor-args",
    "youtube:player_client=mweb",
    "-f",
    "b[height<=480][ext=mp4]/bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480]/b",
    "--download-sections",
    `*${start}-${start + CLIP_SECONDS}`,
    "--force-keyframes-at-cuts",
    "-o",
    template,
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);
  if (!result.ok) {
    console.log(`  SKIP ${videoId}@${start}: ${firstLine(result.stderr)}`);
    return null;
  }
  const file = readdirSync(CACHE).find((f) => f.startsWith(`${videoId}_${start}.`));
  return file ? join(CACHE, file) : null;
}

function encodeClip(input: string, output: string): boolean {
  const result = run("ffmpeg", [
    "-v", "error", "-y",
    "-i", input,
    "-t", String(CLIP_SECONDS),
    "-an",
    "-vf", "scale=-2:min(480\\,ih)",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
    "-movflags", "+faststart",
    output,
  ]);
  if (!result.ok) console.log(`  FAIL encode ${output}: ${firstLine(result.stderr)}`);
  return result.ok;
}

function encodeOwn(input: string, output: string, isGif: boolean): boolean {
  const args = [
    "-v", "error", "-y",
    "-i", input,
    "-vf", "scale=-2:720",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
  ];
  if (isGif) args.push("-an");
  else args.push("-c:a", "aac", "-b:a", "96k");
  args.push(output);
  const result = run("ffmpeg", args);
  if (!result.ok) console.log(`  FAIL encode ${output}: ${firstLine(result.stderr)}`);
  return result.ok;
}

function processYoutube() {
  const jobs = collectJobs();
  console.log(`YouTube: ${jobs.length} clips to produce`);
  let made = 0, skipped = 0, failed = 0;
  for (const job of jobs) {
    const dir = join(OUT, job.exerciseId);
    const output = join(dir, `${job.videoId}_${job.start}.mp4`);
    if (existsSync(output)) { skipped++; continue; }
    mkdirSync(dir, { recursive: true });
    const source = downloadSection(job.videoId, job.start);
    if (!source) { failed++; continue; }
    if (encodeClip(source, output)) { made++; console.log(`  ok   ${job.exerciseId} ← ${job.videoId}@${job.start} (${job.label})`); }
    else failed++;
  }
  console.log(`YouTube done: ${made} made, ${skipped} existing, ${failed} skipped/failed`);
}

function processOwn() {
  console.log(`Own recordings: ${OWN_RECORDINGS.length} files`);
  let made = 0, skipped = 0, failed = 0;
  for (const rec of OWN_RECORDINGS) {
    if (!existsSync(rec.file)) { console.log(`  MISSING ${rec.file}`); failed++; continue; }
    const dir = join(OUT, rec.exercise_id);
    const prefix = rec.kind === "own" ? "own_" : "clip_";
    const output = join(dir, `${prefix}${slugify(basename(rec.file, extname(rec.file)))}.mp4`);
    if (existsSync(output)) { skipped++; continue; }
    mkdirSync(dir, { recursive: true });
    const isGif = extname(rec.file).toLowerCase() === ".gif";
    if (encodeOwn(rec.file, output, isGif)) { made++; console.log(`  ok   ${rec.exercise_id} ← ${basename(rec.file)}`); }
    else failed++;
  }
  console.log(`Own done: ${made} made, ${skipped} existing, ${failed} failed`);
}

function main() {
  const args = process.argv.slice(2);
  const only = args.includes("--own") ? "own" : args.includes("--yt") ? "yt" : "all";
  for (const tool of ["yt-dlp", "ffmpeg"]) {
    if (!run(tool, ["--version"]).ok && !run(tool, ["-version"]).ok) {
      console.error(`${tool} not found. Install with: brew install yt-dlp ffmpeg`);
      process.exit(1);
    }
  }
  mkdirSync(OUT, { recursive: true });
  if (only !== "own") processYoutube();
  if (only !== "yt") processOwn();
  // Keep a copy of the label map so upload.ts can label clips without re-parsing
  copyFileSync("data/movemore/B1P1.json", join(OUT, ".programme.json"));
}

main();
