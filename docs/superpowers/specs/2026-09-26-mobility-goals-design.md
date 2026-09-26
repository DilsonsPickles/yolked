# Mobility & Goals — design

Date: 2026-09-26
Status: approved in principle (owner delegated detailed decisions; feedback on the end result)

## 1. Purpose

Extend Yolked from a barbell set tracker into a single place for the owner's whole
practice: strength (5x5, Nippard-style lifts, calisthenics) **and** mobility, in the
same session and the same history.

Concrete drivers:

- Two MoveMore programmes from Jason Round (Block 1 Phase 1 and Phase 2, 2024) must
  be importable and runnable exactly as written, with each movement's reference
  video one tap away.
- Two initial goals: **muscle up** (strength) and **pancake** (mobility). Each goal has
  a ladder of exercises. Every rung goes through *learning form → building
  (range or load) → maintaining*. That lifecycle is the owner's "form → ROM →
  maintenance" idea made explicit.
- Every session should combine strength and mobility.

Non-goals for this iteration: automatic session generation from rules alone,
per-exercise status outside of goal ladders, any change to the social layer.

## 2. Concepts

- **Exercise** — a movement. Global (free-exercise-db seed) or owned by a user.
  Owned exercises carry a kind (strength, mobility, skill, project), reference
  links (YouTube with timecode) and media (short clips, the owner's own form videos).
- **Workout** — a template, as today. New: exercises may be grouped into **blocks**.
- **Block** — a lettered group (A, B, C…) done as rounds: A1, A2, A3 with minimal
  rest, then a timed rest, then the next round. Has a section (prep, main, auxiliary,
  finishing), a rounds range and rest seconds. Exercises with no block behave exactly
  as today (straight sets, per-set rest), so existing workouts are untouched.
- **Prescription** — what to do for one exercise inside a workout. Today: sets, reps,
  weight. New optional fields: reps range, seconds, tempo, method, each side, and the
  trainer's original wording as a fallback display.
- **Goal** — a named target with a pass condition (muscle up: one clean rep; pancake:
  chest to floor; the nine MoveMore "Zero Point" benchmarks). Optionally tied to a
  benchmark exercise and a target hold/rep count so progress can be read from history.
- **Rung** — one step on a goal's ladder: an exercise, a prescription, a "graduate
  when" condition, and a status: locked, form, building, maintaining.

## 3. Schema

One additive migration: `supabase/migrations/20260926_mobility_and_goals.sql`.

### 3.1 exercises

```
owner_id      uuid null references profiles(id) on delete cascade   -- null = global seed
kind          text not null default 'strength'  check in (strength, mobility, skill, project)
source        text not null default 'free-exercise-db'              -- 'movemore' | 'user'
links         jsonb not null default '[]'   -- [{label, url, start_seconds}] first = primary demo
media         jsonb not null default '[]'   -- [{path, kind: 'clip'|'own', label}] paths in bucket
notes         text null                     -- cues / trainer notes
```

Index on `owner_id`. RLS: select where `owner_id is null or owner_id = auth.uid()`;
insert/update/delete where `owner_id = auth.uid()`. This replaces the current
"viewable by all authenticated" select policy. Owned exercise ids are slugs prefixed
`u_` (user-created) or `mm_` (MoveMore seed).

### 3.2 workout_blocks (new)

```
id            uuid pk
workout_id    uuid not null references workouts(id) on delete cascade
label         text not null              -- 'A'
sort_order    int not null default 0
section       text not null default 'main' check in (prep, main, auxiliary, finishing)
rounds_min    int not null default 1
rounds_max    int not null default 1
rest_seconds  int null                   -- between rounds; null = "minimal"
notes         text null
```

RLS mirrors workout_exercises (via `owns_workout`/workout ownership and shares).

### 3.3 workout_exercises (extended)

```
block_id           uuid null references workout_blocks(id) on delete set null
target_reps        -> becomes nullable (timed work has no reps)
target_reps_max    int null      -- for ranges like 6-8
target_seconds     int null      -- hold / work duration
tempo              text null     -- '[3011]'
method             text null     -- iso | cr | ds | accu | pulse | der | sd
each_side          boolean not null default false
prescription_text  text null     -- trainer's original wording, shown verbatim
```

`target_sets` keeps its meaning: sets per round (usually 1 inside a block).

### 3.4 session_sets (extended)

```
seconds_completed  int null
side               text null check in ('L','R')
round_number       int null
```

Unique `(session_id, exercise_id, set_number)` is kept; `set_number` is a running
index per exercise within the session, `round_number` and `side` are descriptive.

### 3.5 goals / goal_rungs (new)

```
goals
  id, user_id (fk profiles, cascade), name, kind check in (strength, mobility),
  description, pass_condition text not null,
  benchmark_exercise_id text null fk exercises, benchmark_target_seconds int null,
  benchmark_target_reps int null, sort_order int default 0,
  achieved_at timestamptz null, created_at, deleted_at

goal_rungs
  id, goal_id (fk goals, cascade), sort_order int not null,
  exercise_id text not null fk exercises,
  target_sets int null, target_reps int null, target_reps_max int null,
  target_seconds int null, tempo text null, method text null,
  each_side boolean default false, prescription_text text null,
  graduate_when text not null,
  status text not null default 'locked' check in (locked, form, building, maintaining),
  started_at timestamptz null, graduated_at timestamptz null
```

RLS: owner only, through `goals.user_id`.

### 3.6 storage

Private bucket `exercise-media`. Object path `<user_id>/<exercise_id>/<file>`. Storage
policies: a user can read/write objects under their own `<user_id>/` prefix. The app
never exposes public URLs; server components create signed URLs (1 hour) when
rendering a performer or exercise page.

## 4. Behaviour

### 4.1 Workout builder

- Each exercise row gains a **mode** toggle: reps (existing weight/reps inputs, reps
  now a min and optional max) or seconds (a seconds input). Sets stays.
- A **Block** select per row: none, A…H. Rows are still one flat drag-sortable list;
  block membership is by label. Blocks are ordered by the first row carrying their
  label. For each label in use a small block card shows section, rounds min/max and
  rest seconds.
- A "More" disclosure per row: tempo, method, each side, prescription text, notes.
- Save writes blocks first, then exercises with their `block_id`. Update keeps the
  existing delete-and-reinsert strategy for both tables.
- Validation: a block label used by any row must have a block card; rounds_min ≤
  rounds_max; seconds mode requires target_seconds > 0.

### 4.2 Session start (set pre-creation)

Pure function `buildSessionSets(workoutExercises, blocks)` in
`src/lib/sessions/build-sets.ts`, unit-tested:

- Solo exercise (no block): `target_sets` rows, round_number null (today's behaviour,
  plus `each_side` doubling with side L/R).
- Block exercise: for round r in 1..rounds_max, for set s in 1..target_sets, one row
  (two if each_side) with `round_number = r`. Prefill reps from `target_reps`,
  seconds from `target_seconds`, weight from `target_weight`.
- `set_number` is the running index per exercise.

### 4.3 Performer

- Exercises are grouped by block in workout order; solo exercises render as today.
- Block header: label, section, rounds range, rest. Inside, each exercise card shows
  the prescription line (tempo, method, each side, or the verbatim text) and its
  rounds as rows: round number, side badge, then either weight/reps inputs or a
  seconds input with a **hold timer** button that counts down `target_seconds`,
  vibrates (where supported) and fills `seconds_completed` on finish.
- Rest: completing any set of a solo exercise starts the existing rest timer.
  Completing the last exercise of a round in a block starts the block's
  `rest_seconds` timer (falls back to the selected default when null). Completing
  earlier exercises in a round does not start a timer (minimal rest).
- Media: if an exercise has media, a muted looping clip is shown inline (collapsed
  by default to keep the list compact). "Watch full video" opens the primary link at
  its timecode. Links and media also appear in the existing info sheet.
- Previous-session line shows `weight x reps` or `Ns` per set as appropriate.
- Summary and history: volume/PR logic ignores sets without weight, as today.
  Progress graphs gain a "Best hold (s)" metric for exercises that have seconds data.

### 4.4 Exercises

- Exercise browser: filter by kind and a "Mine" toggle; owned exercises show a kind
  badge and a video icon. Exercise detail shows links, clips and notes.
- **New exercise** form (owned): name, kind, primary muscles, equipment, links (label
  + URL, timecode parsed from `t=`), notes. Media is attached by the pipeline, not the
  form, in this iteration.
- Picker: owned exercises are listed first when the query matches.

### 4.5 Goals

- `/goals`: cards per goal (name, kind, current active rung, benchmark progress if
  a benchmark exercise is set, achieved badge). "Build today's session" button.
- `/goals/[id]`: the ladder. Each rung shows exercise, prescription, graduate-when,
  status pill. Actions: Start (locked → form), Form OK (form → building), Graduate
  (building → maintaining, and the next locked rung → form), Reopen (maintaining →
  building). Mark goal achieved. Edit graduate-when text inline. Add a rung from the
  exercise picker; reorder by drag.
- Home dashboard gets a compact "Goals" card showing the active rung per goal.
- Nav gains a Goals tab.

### 4.6 Build today's session

Server action `buildSessionFromGoals({ baseWorkoutId?, goalIds? })`, composition in
a pure, tested function `composePractice(...)`:

1. If a base workout is given, copy its `prep` and `finishing` blocks (labels
   preserved, remapped to fresh ids).
2. `main`: one block per active rung (status form or building) across the chosen
   goals, in goal order, 3 rounds, rest 90 s, using the rung's prescription.
3. `auxiliary`: one block containing all maintaining rungs, 1 round, minimal rest.
4. Creates a workout named `Practice · <YYYY-MM-DD>` and returns its id; the caller
   redirects to the builder so the owner can adjust before performing.

Mixing a strength goal and a mobility goal therefore yields a strength-plus-mobility
session by construction.

## 5. Import of MoveMore programmes

Two stages so the PDFs are never needed again after the first run.

1. `scripts/movemore/extract_pdf.py` (Python, pypdf, one-off): for each routine page
   emits raw lines with their block label, exercise name, prescription text, and the
   YouTube links anchored on that line, resolved by annotation rectangle position.
   Output committed as `data/movemore/B1P1.raw.json`, `B1P2.raw.json`, plus the
   projects/benchmarks page.
2. `scripts/movemore/parse.ts` (TypeScript, pure, unit-tested): raw → structured
   programme JSON (`data/movemore/B1P1.json` …): routines, blocks (label, section,
   rounds, rest), exercises with parsed prescription fields. Parsing rules:
   - `6-8x` → reps 6, reps_max 8; `10x` → reps 10
   - `60”`, `30"`, `90-120”` → seconds (lower bound), `5’` → minutes×60
   - `[3011]` → tempo; `ea.` → each_side; `CR` → cr; `DS:` → ds; `accu.` → accu;
     `iso.` → iso; `DeR` → der; `SD` → sd; `pulse` → pulse
   - Block rounds/rest from the trailing line (`2-3 rounds / ca. 90” rest`,
     `1 round`, `minimal rest`); section from the page headings
     (Prehabilitation & preparation → prep, Main-body → main,
     Auxiliary & finishing → auxiliary/finishing)
   - Everything is kept verbatim in `prescription_text` regardless.
3. `scripts/seed-movemore.ts`: upserts owned exercises (`mm_<slug>`, kind inferred:
   strength for tempo/rep-based lifts and hangs, mobility for holds/stretches,
   project for the two movement projects) for the user identified by
   `SEED_USER_EMAIL`, then creates workouts: `B1P1 · SSP A`, `B1P1 · SSP B`,
   `B1P1 · Upper-body Strength & Mobility`, `B1P1 · Lower-body Complexity`, the
   same four for B1P2, and `Movement Projects`. Re-runnable: workouts are matched by
   name and replaced.
4. The same seed creates the goals: **Muscle up**, **Pancake**, and the nine Zero
   Point benchmarks, with ladders (section 6).

## 6. Seeded ladders

**Muscle up** (strength). Rungs, graduate-when in brackets:
1. Passive + active hang, 60 s accumulated each [60 s passive, 30 s active unbroken]
2. Ring row progression, 3×8 [8 clean reps at the deepest progression]
3. Pull-up, 3×5 [3×8]
4. Ring support hold, 3×15 s [3×30 s]
5. Ring dip, 3×5 [3×8 full depth]
6. False-grip ring row, 3×6 [3×8 chest to rings]
7. Chest-to-bar / high pull-up, 3×5 [3×5 with sternum at bar]
8. Muscle-up negative, 3×3 slow [3×3 at 5 s each]
9. Band-assisted / low-ring muscle up, 3×3 [3 clean unassisted reps]
10. Muscle up [pass condition]

**Pancake** (mobility):
1. Standing + seated pike stretching, 60 s each [comfortable flat back at 60 s]
2. Loaded butterfly, CR 5–8 [knees within a fist of the floor]
3. Cross-leg stretch progression, 30 s CR + 30 s [both sides even]
4. Elevated pancake iso (unloaded), 60 s CR [chest to elevated surface]
5. Unilateral good-morning CR, 30/25/20 s each [full-range each side]
6. Elevated top-loaded pancake, 60 s CR [chest to floor from elevation]
7. Floor pancake, 2×60 s [pass condition]

**Zero Point benchmarks** (one goal each, benchmark exercise + target, no ladder):
120 s passive hang, 60 s active hang, 60 s German hang, 60 s handstand, 20 min
resting squat, 20 min flat-foot kneeling, 3 min horse stance, 3 min dragon squat
each side, 15 min single-leg stand each leg.

The first rung of each ladder is seeded as `form`; others `locked`.

## 7. Media pipeline (local scripts, not part of the app)

Prerequisite: `brew install yt-dlp ffmpeg`.

- `scripts/media/clip.ts`: reads the programme JSON, and for each unique
  (video id, timecode) downloads only the needed section
  (`yt-dlp --download-sections "*T-(T+45)" --force-keyframes-at-cuts`), then
  `ffmpeg` re-encodes to a muted 480p H.264 MP4 with faststart, ~1–2 MB each.
  Output `media-out/<exercise_id>/<videoId>_<t>.mp4`. Skips existing outputs.
  Private or removed videos are reported and skipped; the link remains.
- Own recordings: a mapping table in the script from the six MOV files in
  `Desktop/Movement/B1P1` (and the wrist-routine MP4 and A1–A10 GIFs from the
  Upper-body folder) to exercise ids; re-encoded to 720p H.264, audio kept.
  GIFs are converted to MP4.
- `scripts/media/upload.ts`: uploads `media-out/**` to the `exercise-media`
  bucket under the owner's prefix and merges entries into `exercises.media`.
  Idempotent by path.

Rights note: the clips are the trainer's material, downloaded for the owner's
private use only. They live in a private bucket and are never shared.

## 8. Error handling

- Builder/server actions return `{ error }` as today; the builder surfaces it.
- Session start with malformed prescriptions still creates sets (fallbacks: 1 set,
  null reps/seconds) so a session is never blocked.
- Signed URL failures degrade to no inline clip; the YouTube link still shows.
- Goal transitions are single-row updates; the "next rung → form" step is done in
  the same server action and is idempotent.
- Seed scripts are re-runnable and log skipped/failed rows without aborting.

## 9. Testing

- Add `vitest`. Unit tests for: `parse.ts` (prescription and block parsing against
  real lines from both PDFs), `build-sets.ts`, `composePractice`.
- `npm run build` and `npm run lint` must pass.
- Manual: run the dev server, import the programmes against the live project,
  perform one MoveMore routine end to end in the browser, build a session from the
  two goals, and check an existing 5x5 workout still performs unchanged.

## 10. Rollout

- Migration is additive and is pushed to the live Supabase project before the
  branch is merged; old app code ignores the new columns.
- Work happens on branch `mobility-goals`; pushed for a Vercel preview. Merging to
  `main` is the owner's call after feedback.
