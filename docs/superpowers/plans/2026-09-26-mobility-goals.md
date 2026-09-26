# Mobility & Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Yolked run the owner's MoveMore mobility programmes (blocks, timed holds, tempo, reference clips) alongside lifting, and track goal ladders (muscle up, pancake, Zero Point benchmarks) whose active rungs can be composed into a strength-plus-mobility session.

**Architecture:** One additive Supabase migration (owned exercises with links/media, workout blocks, richer prescriptions, seconds/side on sets, goals + rungs, private media bucket). Pure, unit-tested TypeScript modules for prescription parsing, session-set generation and practice composition; Next.js server actions and client components extend the existing builder, performer and exercise pages; scripts import the programmes and produce clips.

**Tech Stack:** Next.js 16 (App Router, server actions), TypeScript 5 strict, Supabase (Postgres, RLS, Storage), Tailwind 4, @dnd-kit, vitest (new), tsx for scripts, Python 3 + pypdf (one-off extraction), yt-dlp + ffmpeg (media).

**Spec:** `docs/superpowers/specs/2026-09-26-mobility-goals-design.md`

## Global Constraints

- All mutations go through server actions in `actions.ts` files; call `revalidatePath` after writes.
- Session/history queries include explicit `.eq("user_id", user.id)`; never rely on RLS alone.
- Existing workouts (no blocks) must perform exactly as before.
- Owned exercise ids: `mm_<slug>` for the MoveMore seed, `u_<slug>` for user-created.
- Migration file: `supabase/migrations/20260926_mobility_and_goals.sql`, additive only.
- Media bucket: `exercise-media`, private, object path `<user_id>/<exercise_id>/<file>`.
- Branch: `mobility-goals`. Commit after every task with the attribution trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- `npm run build` and `npm run lint` must pass at the end of every task that touches `src/`.
- Dark zinc/orange Tailwind styling as in the existing components; copy class strings from neighbours.

---

### Task 1: Test tooling, migration and types

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.config.ts`
- Create: `supabase/migrations/20260926_mobility_and_goals.sql`
- Modify: `src/lib/types/database.ts`

**Interfaces:**
- Produces types used everywhere after: `ExerciseKind`, `ExerciseLink`, `ExerciseMedia`, `Exercise` (extended), `BlockSection`, `WorkoutBlock`, `PrescriptionMethod`, `WorkoutExercise` (extended), `SessionSet` (extended), `GoalKind`, `Goal`, `RungStatus`, `GoalRung`.

- [ ] **Step 1: Add vitest and tsx**

```bash
npm install -D vitest tsx
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 2: Write a smoke test and run it**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
describe("vitest", () => { it("runs", () => expect(1 + 1).toBe(2)); });
```

Run: `npm test` → 1 passed. Delete the smoke test afterwards.

- [ ] **Step 3: Write the migration**

`supabase/migrations/20260926_mobility_and_goals.sql`:

```sql
-- ===== exercises: ownership, kind, links, media =====
alter table public.exercises
  add column if not exists owner_id uuid references public.profiles(id) on delete cascade,
  add column if not exists kind text not null default 'strength'
    check (kind in ('strength','mobility','skill','project')),
  add column if not exists source text not null default 'free-exercise-db',
  add column if not exists links jsonb not null default '[]'::jsonb,
  add column if not exists media jsonb not null default '[]'::jsonb,
  add column if not exists notes text;

create index if not exists idx_exercises_owner on public.exercises(owner_id);
create index if not exists idx_exercises_kind on public.exercises(kind);

drop policy if exists "Exercises are viewable by authenticated users" on public.exercises;
create policy "Exercises: global or own"
  on public.exercises for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
create policy "Exercises: insert own"
  on public.exercises for insert to authenticated
  with check (owner_id = auth.uid());
create policy "Exercises: update own"
  on public.exercises for update to authenticated
  using (owner_id = auth.uid());
create policy "Exercises: delete own"
  on public.exercises for delete to authenticated
  using (owner_id = auth.uid());

-- ===== workout blocks =====
create table if not exists public.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  section text not null default 'main'
    check (section in ('prep','main','auxiliary','finishing')),
  rounds_min integer not null default 1,
  rounds_max integer not null default 1,
  rest_seconds integer,
  notes text,
  constraint workout_blocks_rounds check (rounds_min >= 1 and rounds_max >= rounds_min)
);
create index if not exists idx_workout_blocks_workout on public.workout_blocks(workout_id);
alter table public.workout_blocks enable row level security;

-- Same visibility as workout_exercises: owner, or shared with me.
create policy "Blocks: view own or shared"
  on public.workout_blocks for select
  using (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
    or exists (select 1 from public.workout_shares s where s.workout_id = workout_blocks.workout_id and s.shared_with_user_id = auth.uid())
  );
create policy "Blocks: insert own"
  on public.workout_blocks for insert
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "Blocks: update own"
  on public.workout_blocks for update
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "Blocks: delete own"
  on public.workout_blocks for delete
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- ===== workout_exercises: richer prescriptions =====
alter table public.workout_exercises
  alter column target_reps drop not null,
  add column if not exists block_id uuid references public.workout_blocks(id) on delete set null,
  add column if not exists target_reps_max integer,
  add column if not exists target_seconds integer,
  add column if not exists tempo text,
  add column if not exists method text
    check (method is null or method in ('iso','cr','ds','accu','pulse','der','sd')),
  add column if not exists each_side boolean not null default false,
  add column if not exists prescription_text text;
create index if not exists idx_workout_exercises_block on public.workout_exercises(block_id);

-- ===== session_sets: timed work and sides =====
alter table public.session_sets
  add column if not exists seconds_completed integer,
  add column if not exists side text check (side is null or side in ('L','R')),
  add column if not exists round_number integer;

-- ===== goals =====
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('strength','mobility')),
  description text,
  pass_condition text not null,
  benchmark_exercise_id text references public.exercises(id),
  benchmark_target_seconds integer,
  benchmark_target_reps integer,
  sort_order integer not null default 0,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_goals_user on public.goals(user_id);
alter table public.goals enable row level security;
create policy "Goals: own" on public.goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.goal_rungs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  sort_order integer not null default 0,
  exercise_id text not null references public.exercises(id),
  target_sets integer,
  target_reps integer,
  target_reps_max integer,
  target_seconds integer,
  tempo text,
  method text check (method is null or method in ('iso','cr','ds','accu','pulse','der','sd')),
  each_side boolean not null default false,
  prescription_text text,
  graduate_when text not null,
  status text not null default 'locked'
    check (status in ('locked','form','building','maintaining')),
  started_at timestamptz,
  graduated_at timestamptz
);
create index if not exists idx_goal_rungs_goal on public.goal_rungs(goal_id);
alter table public.goal_rungs enable row level security;
create policy "Rungs: own" on public.goal_rungs for all
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()))
  with check (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));

-- ===== private media bucket =====
insert into storage.buckets (id, name, public)
  values ('exercise-media', 'exercise-media', false)
  on conflict (id) do nothing;

create policy "Media: read own prefix" on storage.objects for select to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Media: write own prefix" on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Media: delete own prefix" on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 4: Extend the types**

In `src/lib/types/database.ts` add/replace:

```ts
export type ExerciseKind = "strength" | "mobility" | "skill" | "project";
export interface ExerciseLink { label: string; url: string; start_seconds: number | null }
export interface ExerciseMedia { path: string; kind: "clip" | "own"; label: string }

export interface Exercise {
  id: string; name: string; force: string | null; level: string; mechanic: string | null;
  equipment: string | null; primary_muscles: string[]; secondary_muscles: string[];
  instructions: string[]; category: string; images: string[];
  owner_id: string | null; kind: ExerciseKind; source: string;
  links: ExerciseLink[]; media: ExerciseMedia[]; notes: string | null;
}

export type BlockSection = "prep" | "main" | "auxiliary" | "finishing";
export interface WorkoutBlock {
  id: string; workout_id: string; label: string; sort_order: number;
  section: BlockSection; rounds_min: number; rounds_max: number;
  rest_seconds: number | null; notes: string | null;
}

export type PrescriptionMethod = "iso" | "cr" | "ds" | "accu" | "pulse" | "der" | "sd";
export interface Prescription {
  target_sets: number; target_reps: number | null; target_reps_max: number | null;
  target_seconds: number | null; target_weight: number | null; tempo: string | null;
  method: PrescriptionMethod | null; each_side: boolean; prescription_text: string | null;
}

export interface WorkoutExercise extends Prescription {
  id: string; workout_id: string; exercise_id: string; sort_order: number;
  block_id: string | null; notes: string | null; exercise?: Exercise;
}

export interface SessionSet {
  id: string; session_id: string; exercise_id: string; set_number: number;
  reps_completed: number | null; weight_used: number | null;
  seconds_completed: number | null; side: "L" | "R" | null; round_number: number | null;
  completed: boolean; completed_at: string | null; exercise?: Exercise;
}

export type GoalKind = "strength" | "mobility";
export interface Goal {
  id: string; user_id: string; name: string; kind: GoalKind; description: string | null;
  pass_condition: string; benchmark_exercise_id: string | null;
  benchmark_target_seconds: number | null; benchmark_target_reps: number | null;
  sort_order: number; achieved_at: string | null; created_at: string; deleted_at: string | null;
}
export type RungStatus = "locked" | "form" | "building" | "maintaining";
export interface GoalRung extends Omit<Prescription, "target_sets" | "target_weight"> {
  id: string; goal_id: string; sort_order: number; exercise_id: string;
  target_sets: number | null; graduate_when: string; status: RungStatus;
  started_at: string | null; graduated_at: string | null; exercise?: Exercise;
}
```

Keep `Profile`, `Bro`, `WorkoutShare`, `Workout`, `WorkoutSession`, `WorkoutReaction` unchanged.

- [ ] **Step 5: Fix compile fallout**

`target_reps` is now `number | null`. Run `npm run build`; fix each error by treating null as "—" in display and `?? 10` where a number is required (`edit-client.tsx` initial data, `workouts-client.tsx` peek list). Do not change behaviour.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts supabase/migrations/20260926_mobility_and_goals.sql src/lib/types/database.ts src
git commit -m "feat(schema): owned exercises, workout blocks, prescriptions, goals; add vitest"
```

---

### Task 2: Prescription parser and formatter

**Files:**
- Create: `src/lib/prescription.ts`
- Test: `src/lib/prescription.test.ts`

**Interfaces:**
- Produces `parsePrescription(text: string): ParsedPrescription` where
  `ParsedPrescription = Omit<Prescription, "target_weight">` (all fields, text preserved),
  and `formatPrescription(p: Partial<Prescription>): string` (one-line human summary).

- [ ] **Step 1: Write failing tests from real programme lines**

```ts
import { describe, it, expect } from "vitest";
import { parsePrescription, formatPrescription } from "./prescription";

describe("parsePrescription", () => {
  it("reps range with tempo and iso", () => {
    const p = parsePrescription("6-8x [3012] 1” TTC hold (deepest progression)");
    expect(p).toMatchObject({ target_sets: 1, target_reps: 6, target_reps_max: 8, tempo: "[3012]", method: "iso", target_seconds: null, each_side: false });
    expect(p.prescription_text).toBe("6-8x [3012] 1” TTC hold (deepest progression)");
  });
  it("sets x reps", () => {
    expect(parsePrescription("2-3x 10x pulses + 10” iso. in end-range ea. rep")).toMatchObject({ target_sets: 2, target_reps: 10, method: "pulse", each_side: true });
  });
  it("timed hold each side with CR", () => {
    expect(parsePrescription("30” CR + 30” breathing to end-range ea.")).toMatchObject({ target_sets: 1, target_reps: null, target_seconds: 30, method: "cr", each_side: true });
  });
  it("sets of seconds", () => {
    expect(parsePrescription("2x 45-60” hold (minimal rest between)")).toMatchObject({ target_sets: 2, target_seconds: 45 });
  });
  it("minutes", () => {
    expect(parsePrescription("3-4’ SD practice")).toMatchObject({ target_seconds: 180, method: "sd" });
  });
  it("drop set of holds", () => {
    expect(parsePrescription("DS: 20”, 15”, 10” holds (minimal rest)")).toMatchObject({ target_sets: 3, target_seconds: 20, method: "ds" });
  });
  it("descending reps each side alternating", () => {
    expect(parsePrescription("DeR: 6x, 5x, 4x ea. alt.")).toMatchObject({ target_sets: 3, target_reps: 6, method: "der", each_side: true });
  });
  it("practice in full has no numbers", () => {
    expect(parsePrescription("practice in full")).toMatchObject({ target_sets: 1, target_reps: null, target_seconds: null, method: null });
  });
  it("accumulated hang", () => {
    expect(parsePrescription("60”+ accu. ea. AND 5x 3” iso. (rest as needed)")).toMatchObject({ target_seconds: 60, method: "accu", each_side: true });
  });
  it("straight quotes work too", () => {
    expect(parsePrescription('6x 5" holds ea. [1015]')).toMatchObject({ target_sets: 6, target_seconds: 5, tempo: "[1015]", each_side: true });
  });
});

describe("formatPrescription", () => {
  it("reps range with tempo", () => {
    expect(formatPrescription({ target_sets: 3, target_reps: 6, target_reps_max: 8, tempo: "[3011]", each_side: false })).toBe("3 × 6-8 [3011]");
  });
  it("seconds each side", () => {
    expect(formatPrescription({ target_sets: 2, target_seconds: 30, each_side: true, method: "cr" })).toBe("2 × 30s CR ea.");
  });
  it("falls back to text", () => {
    expect(formatPrescription({ target_sets: 1, prescription_text: "practice in full" })).toBe("practice in full");
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → cannot resolve `./prescription`.

- [ ] **Step 3: Implement**

```ts
import type { Prescription, PrescriptionMethod } from "@/lib/types/database";

export type ParsedPrescription = Omit<Prescription, "target_weight">;

const SEC = /(\d+)(?:\s*-\s*(\d+))?\s*(?:”|"|″)/;           // 30” or 45-60”
const MIN = /(\d+)(?:\s*-\s*(\d+))?\s*(?:’|'|′)(?!\s*\w)/;   // 3-4’ (not 5' wrist... ok since 5' is followed by space+word? see below)
const REPS = /(\d+)(?:\s*-\s*(\d+))?\s*x\b/i;               // 6-8x
const SETS_X = /^(\d+)(?:\s*-\s*(\d+))?\s*x\s+(?=\d)/i;      // leading "2-3x " followed by a number
const TEMPO = /\[[0-9X]{4}\]/i;

function normalise(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function parsePrescription(raw: string): ParsedPrescription {
  const text = normalise(raw);
  let rest = text;
  let target_sets = 1;

  // Leading "NxM" pattern: first number = sets, then continue parsing reps/seconds from the remainder.
  const setsMatch = rest.match(SETS_X);
  if (setsMatch) {
    target_sets = parseInt(setsMatch[1]);
    rest = rest.slice(setsMatch[0].length);
  }

  // Drop set / descending: count the listed values.
  const list = rest.match(/(?:DS|DeR):\s*((?:\d+(?:\s*-\s*\d+)?\s*(?:”|"|x)\s*,?\s*)+)/i);
  if (list) {
    const items = list[1].match(/\d+(?:\s*-\s*\d+)?\s*(?:”|"|x)/g) ?? [];
    if (items.length > 1) target_sets = items.length;
  }

  // "6x 5” holds" → sets 6, seconds 5 (reps-x followed by seconds)
  const repsThenSec = rest.match(/^(\d+)x\s+(\d+)\s*(?:”|")/i);
  if (repsThenSec && !setsMatch) {
    target_sets = parseInt(repsThenSec[1]);
    rest = rest.slice(repsThenSec[1].length + 1);
  }

  const reps = rest.match(REPS);
  const sec = rest.match(SEC);
  const min = rest.match(MIN);
  const tempo = text.match(TEMPO)?.[0] ?? null;

  let target_reps: number | null = null;
  let target_reps_max: number | null = null;
  if (reps && !(repsThenSec && !setsMatch)) {
    target_reps = parseInt(reps[1]);
    target_reps_max = reps[2] ? parseInt(reps[2]) : null;
  }

  let target_seconds: number | null = null;
  if (sec) target_seconds = parseInt(sec[1]);
  else if (min) target_seconds = parseInt(min[1]) * 60;

  const lower = text.toLowerCase();
  let method: PrescriptionMethod | null = null;
  if (/\bds:/i.test(text)) method = "ds";
  else if (/\bder:/i.test(text)) method = "der";
  else if (/\bcr\b/i.test(text)) method = "cr";
  else if (/accu\./.test(lower)) method = "accu";
  else if (/pulse/.test(lower)) method = "pulse";
  else if (/\bsd\b/i.test(text)) method = "sd";
  else if (/iso\.|iso\b|hold/.test(lower)) method = "iso";

  const each_side = /\bea\.|\bea\b|each side/.test(lower);

  return {
    target_sets, target_reps, target_reps_max, target_seconds,
    tempo, method, each_side, prescription_text: text,
  };
}

const METHOD_LABEL: Record<PrescriptionMethod, string> = {
  iso: "iso", cr: "CR", ds: "DS", accu: "accu.", pulse: "pulses", der: "DeR", sd: "SD",
};

export function formatPrescription(p: Partial<Prescription>): string {
  const parts: string[] = [];
  const sets = p.target_sets ?? 1;
  if (p.target_reps != null) {
    parts.push(`${sets} × ${p.target_reps}${p.target_reps_max ? `-${p.target_reps_max}` : ""}`);
  } else if (p.target_seconds != null) {
    parts.push(`${sets} × ${p.target_seconds}s`);
  } else {
    return p.prescription_text ?? (sets > 1 ? `${sets} sets` : "");
  }
  if (p.tempo) parts.push(p.tempo);
  if (p.method && p.method !== "iso") parts.push(METHOD_LABEL[p.method]);
  if (p.each_side) parts.push("ea.");
  return parts.join(" ");
}
```

- [ ] **Step 4: Run tests; adjust regexes until all pass.** Note the tricky case `5' wrist-strength & mobility routine` is an exercise *name*, never a prescription, so `MIN` only needs to handle `3-5’`, `3-4’`, `2-3’`, `5’+`.

- [ ] **Step 5: Commit** — `git commit -m "feat: prescription parser and formatter"`

---

### Task 3: Extract raw programme data from the PDFs

**Files:**
- Create: `scripts/movemore/extract_pdf.py`
- Create: `scripts/movemore/README.md`
- Create: `data/movemore/B1P1.raw.json`, `data/movemore/B1P2.raw.json`

**Interfaces:**
- Produces raw JSON consumed by Task 4:

```ts
interface RawProgramme {
  phase: string;                // "B1P1"
  dates: string;                // "26.08 - 06.10.24"
  pages: RawPage[];
}
interface RawPage {
  page: number;
  title: string;                // "SSP" | "UBSM" | "LBC" | "Projects"
  lines: RawLine[];             // in reading order, only exercise / round / heading lines
}
interface RawLine {
  kind: "heading" | "exercise" | "rounds" | "project";
  text: string;                 // full line text, whitespace-normalised
  label?: string;               // "A1" for exercise lines
  name?: string;                // exercise name (text before the " - " separator)
  prescription?: string;        // text after the separator
  links: { anchor: string; url: string }[];  // links anchored on this line, left to right
}
```

- [ ] **Step 1: Write the extractor**

`scripts/movemore/extract_pdf.py` (run with the scratch venv that has pypdf, or `pip install pypdf`):

```python
"""One-off: extract routine lines + anchored links from a MoveMore programme PDF.
Usage: python scripts/movemore/extract_pdf.py "<pdf>" data/movemore/B1P1.raw.json
"""
import json, re, sys
from pypdf import PdfReader

PAGE_TITLES = {3: "Projects", 4: "SSP", 5: "UBSM", 6: "LBC"}
EX_RE = re.compile(r"^(?:(?P<label>[A-H]\d{1,2})\.|•)\s*(?P<body>.+)$")
ROUNDS_RE = re.compile(r"^\d+(?:-\d+)?\s*rounds?\b", re.I)
HEADINGS = ("Prehabilitation & preparation:", "Main-body:", "Auxiliary & finishing:",
            "SSP A", "SSP B", "Movement Projects:")

def page_lines(page):
    frags = []
    def visit(text, cm, tm, fd, fs):
        if text.strip():
            frags.append((tm[4], tm[5], text))
    page.extract_text(visitor_text=visit)
    rows = {}
    for x, y, t in frags:
        rows.setdefault(round(y), []).append((x, t))
    links = []
    for a in page.get("/Annots") or []:
        a = a.get_object(); uri = (a.get("/A") or {}).get("/URI")
        if uri and ("youtu" in uri or "drive.google" in uri):
            x0, y0, x1, y1 = [float(v) for v in a["/Rect"]]
            links.append((x0, y0, x1, y1, uri))
    out = []
    for y in sorted(rows, reverse=True):
        parts = sorted(rows[y])
        text = re.sub(r"\s+", " ", "".join(t for _, t in parts)).strip()
        here = []
        for x0, y0, x1, y1, uri in links:
            if y0 - 2 <= y <= y1 + 2:
                anchor = "".join(t for x, t in parts if x0 - 3 <= x <= x1 + 3).strip()
                here.append((x0, anchor, uri))
        here.sort()
        out.append((text, [{"anchor": a, "url": u} for _, a, u in here]))
    return out

def classify(text, links):
    if any(text.startswith(h) for h in HEADINGS):
        return {"kind": "heading", "text": text, "links": links}
    if ROUNDS_RE.match(text):
        return {"kind": "rounds", "text": text, "links": links}
    m = EX_RE.match(text)
    if m:
        body = m.group("body")
        name, _, presc = body.partition(" - ")
        if not presc:
            name, _, presc = body.partition("-")
        return {"kind": "project" if text.startswith("•") else "exercise",
                "text": text, "label": m.group("label"), "name": name.strip(),
                "prescription": presc.strip(), "links": links}
    return None

def main(pdf, out):
    r = PdfReader(pdf)
    first = r.pages[0].extract_text()
    phase = re.search(r"/ (B\dP\d) \(([^)]+)\)", first)
    pages = []
    for num, title in PAGE_TITLES.items():
        lines = []
        for text, links in page_lines(r.pages[num - 1]):
            line = classify(text, links)
            if line: lines.append(line)
        pages.append({"page": num, "title": title, "lines": lines})
    json.dump({"phase": phase.group(1), "dates": phase.group(2), "pages": pages},
              open(out, "w"), indent=2, ensure_ascii=False)
    print(f"wrote {out}: " + ", ".join(f"{p['title']}={len(p['lines'])}" for p in pages))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
```

- [ ] **Step 2: Run it for both PDFs**

```bash
VENV=/private/tmp/claude-501/-Users-alexdawsonsmac-Documents-webdev-credit-card-bill-calculator/8bdf3ca3-ac7b-4f38-8e2d-9eb59f4cdee0/scratchpad/venv
$VENV/bin/python scripts/movemore/extract_pdf.py "/Users/alexdawsonsmac/Desktop/Movement/B1P1/B1P1 - Alex Dawson OSCP.pdf" data/movemore/B1P1.raw.json
$VENV/bin/python scripts/movemore/extract_pdf.py "/Users/alexdawsonsmac/Downloads/B1P2 - Alex Dawson OSCP.pdf" data/movemore/B1P2.raw.json
```

- [ ] **Step 3: Verify by eye**

Open each raw file and check against the extracted text from the spec session: SSP page has 15 exercise lines (A1–A10, B1–B5) and two rounds lines; UBSM has 19 exercises + 1 project + 7 rounds lines; LBC has 19 exercises + 1 project + 7 rounds lines; every exercise line has at least one link except the ones the PDF genuinely leaves unlinked. Fix the separator handling if any `name` contains prescription text (the PDF uses `   -   ` with variable spacing; text extraction may collapse it to `-`; the fallback `partition("-")` must only be used when the `" - "` form is absent and must split on the **first** hyphen that is followed by a digit or a word like `practice`/`DS`/`DeR`/`CR` — adjust the regex to `re.split(r"\s*-\s*(?=\d|practice|DS|DeR|CR|perform|ca\.)", body, 1)` if names with hyphens like `Ring-support` get cut).

- [ ] **Step 4: README**

`scripts/movemore/README.md`: what each script does, that the PDFs are not committed, the two commands above, and `npm run movemore:parse` (Task 4) and `npm run seed:movemore` (Task 5).

- [ ] **Step 5: Commit** — `git add scripts/movemore data/movemore && git commit -m "data: raw MoveMore B1P1/B1P2 extraction with anchored video links"`

---

### Task 4: Parse raw data into structured programmes

**Files:**
- Create: `scripts/movemore/parse.ts` (pure + a small CLI `main`)
- Test: `scripts/movemore/parse.test.ts`
- Create: `data/movemore/B1P1.json`, `data/movemore/B1P2.json`
- Modify: `package.json` scripts: `"movemore:parse": "tsx scripts/movemore/parse.ts"`

**Interfaces:**
- Produces:

```ts
export interface ProgrammeExercise {
  id: string;            // "mm_ring_row_progression"
  name: string;          // "Ring row progression"
  kind: "strength" | "mobility" | "skill" | "project";
  links: { label: string; url: string; start_seconds: number | null }[];
}
export interface ProgrammeBlockExercise extends ParsedPrescription {
  label: string;         // "C1"
  exercise_id: string;
  notes: string | null;  // parenthetical remarks, e.g. "(review ‘In Focus’)"
}
export interface ProgrammeBlock {
  label: string; section: BlockSection; rounds_min: number; rounds_max: number;
  rest_seconds: number | null; notes: string | null; exercises: ProgrammeBlockExercise[];
}
export interface ProgrammeRoutine { name: string; frequency: string | null; blocks: ProgrammeBlock[] }
export interface Programme { phase: string; dates: string; exercises: ProgrammeExercise[]; routines: ProgrammeRoutine[] }
export function parseProgramme(raw: RawProgramme): Programme
export function slugify(name: string): string        // "Ring row progression" → "ring_row_progression"
export function youtubeStart(url: string): number|null // "&t=151s" → 151, "?t=4s" → 4, none → null
```

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from "vitest";
import { parseProgramme, slugify, youtubeStart, parseRounds } from "./parse";
import raw1 from "../../data/movemore/B1P1.raw.json";

describe("helpers", () => {
  it("slugify", () => expect(slugify("Pronated, Supinated, AND Active hang")).toBe("pronated_supinated_and_active_hang"));
  it("youtubeStart", () => {
    expect(youtubeStart("https://www.youtube.com/watch?v=x&t=151s")).toBe(151);
    expect(youtubeStart("https://youtu.be/x")).toBeNull();
  });
  it("parseRounds", () => {
    expect(parseRounds("2-3 rounds / ca. 90” rest")).toEqual({ rounds_min: 2, rounds_max: 3, rest_seconds: 90 });
    expect(parseRounds("1-2 rounds / minimal rest")).toEqual({ rounds_min: 1, rounds_max: 2, rest_seconds: null });
    expect(parseRounds("1 round")).toEqual({ rounds_min: 1, rounds_max: 1, rest_seconds: null });
    expect(parseRounds("2-3 rounds / 60-90” rest BETWEEN sets")).toEqual({ rounds_min: 2, rounds_max: 3, rest_seconds: 60 });
    expect(parseRounds("3 rounds / 2-3’ rest")).toEqual({ rounds_min: 3, rounds_max: 3, rest_seconds: 120 });
  });
});

describe("parseProgramme B1P1", () => {
  const p = parseProgramme(raw1 as never);
  it("has four routines plus projects", () => {
    expect(p.routines.map((r) => r.name)).toEqual([
      "SSP A", "SSP B", "Upper-body Strength & Mobility", "Lower-body Complexity", "Movement Projects",
    ]);
  });
  it("UBSM has blocks A–G with the right sections", () => {
    const u = p.routines[2];
    expect(u.blocks.map((b) => `${b.label}:${b.section}`)).toEqual([
      "A:prep", "B:prep", "C:main", "D:main", "E:main", "F:auxiliary", "G:finishing",
    ]);
    expect(u.blocks[2]).toMatchObject({ rounds_min: 2, rounds_max: 3, rest_seconds: 90 });
    expect(u.blocks[2].exercises[0]).toMatchObject({ label: "C1", exercise_id: "mm_ring_row_progression", target_reps: 6, target_reps_max: 8, tempo: "[3012]" });
  });
  it("dedupes exercises across routines and keeps the primary link first", () => {
    const hang = p.exercises.find((e) => e.id === "mm_pronated_supinated_and_active_hang")!;
    expect(hang.links.length).toBe(3);
    expect(hang.links[0]).toMatchObject({ url: "https://www.youtube.com/watch?v=bnWaw_-m9XU&t=5s", start_seconds: 5 });
    expect(p.exercises.filter((e) => e.id === hang.id).length).toBe(1);
  });
  it("classifies kinds", () => {
    const byId = Object.fromEntries(p.exercises.map((e) => [e.id, e.kind]));
    expect(byId["mm_ring_row_progression"]).toBe("strength");
    expect(byId["mm_cross_leg_stretch_progression"]).toBe("mobility");
    expect(byId["mm_360_stick_roll"]).toBe("project");
  });
});
```

- [ ] **Step 2: Run** — fails (module missing).

- [ ] **Step 3: Implement `parse.ts`**

Rules (write them as code, keep functions small):

- `slugify`: lowercase, strip quotes/apostrophes/curly quotes, replace non-alphanumerics with `_`, collapse, trim `_`.
- `youtubeStart`: `/[?&]t=(\d+)s?/`.
- `parseRounds(text)`: `(\d+)(?:-(\d+))?\s*rounds?` → min/max; rest: seconds `(\d+)(?:-\d+)?\s*(?:”|")` or minutes `(\d+)(?:-\d+)?\s*(?:’|')` ×60; "minimal"/"no rest"/absent → null.
- Section for SSP pages: everything is `main` (SSP has no headings, block per routine: SSP A = block "A", SSP B = block "B"). For UBSM/LBC: track the current heading; `Prehabilitation & preparation:` → `prep`; `Main-body:` → `main`; `Auxiliary & finishing:` → blocks F → `auxiliary`, G → `finishing` (the last block under that heading is finishing).
- Walk lines: an `exercise` line opens/extends the block whose label is the letter of its label; a `rounds` line closes the current block with `parseRounds`. A `project` line becomes routine "Movement Projects" only from the Projects page (on UBSM/LBC pages the bullet project line is skipped, it duplicates the projects routine).
- Routines: SSP page → two routines "SSP A" (block A) and "SSP B" (block B), frequency from the heading text `SSP A– 4-6x per week*`. UBSM page → "Upper-body Strength & Mobility", LBC → "Lower-body Complexity". Projects page → "Movement Projects" with one block A, 1 round, exercises from the two `A1./A2.` lines and prescription from the rounds line (`1-2 rounds 10’ ea., OR 2-4 rounds 5’ ea.` → rounds 1–2, seconds 600).
- Exercise identity: `id = "mm_" + slugify(name)`; merge links across occurrences (dedupe by url), primary = first link on the first occurrence whose anchor is inside the name (anchor text is a substring of `name`); other links get `label = anchor`.
- `kind`: `project` if from the Projects page; `strength` if the name matches `/pushup|row|squat|hang|dip|chinup|bridge|calf|reach|hip-break|lunge|sissy|support|arch|plate|table|posting|raise/i` or the prescription has a tempo; otherwise `mobility`.
- `notes`: any parenthetical in the prescription, e.g. `(review ‘In Focus’)`, joined with `; `; also non-primary link anchors like `review webinar notes` are already in links.
- CLI `main`: for each of `B1P1`, `B1P2`, read `data/movemore/<phase>.raw.json`, write `data/movemore/<phase>.json`, print counts. Guard with `if (process.argv[1]?.endsWith("parse.ts"))`.

- [ ] **Step 4: Run tests until green; run `npm run movemore:parse`; inspect both JSON files** — every routine has the expected block count; no exercise has empty links unless the PDF had none.

- [ ] **Step 5: Commit** — `git commit -m "feat(movemore): parse raw programme data into structured JSON"`

---

### Task 5: Seed script for exercises, workouts and goals

**Files:**
- Create: `scripts/seed-movemore.ts`
- Create: `scripts/movemore/ladders.ts` (the seeded ladders as data)
- Modify: `package.json` scripts: `"seed:movemore": "tsx scripts/seed-movemore.ts"`

**Interfaces:**
- Consumes `data/movemore/B1P1.json`, `B1P2.json` (Task 4 types).
- Env: `SEED_USER_EMAIL` (required), `.env.local` loaded like `seed-test-user.ts`.

- [ ] **Step 1: Ladder data**

`scripts/movemore/ladders.ts` exports:

```ts
export interface LadderRung {
  exercise: { id: string; name?: string; kind?: ExerciseKind; muscles?: string[]; equipment?: string };
  target_sets?: number; target_reps?: number; target_reps_max?: number; target_seconds?: number;
  tempo?: string; method?: PrescriptionMethod; each_side?: boolean; prescription_text?: string;
  graduate_when: string;
}
export interface LadderGoal {
  name: string; kind: GoalKind; description: string; pass_condition: string;
  benchmark?: { exercise_id: string; target_seconds?: number; target_reps?: number };
  rungs: LadderRung[];
}
export const GOALS: LadderGoal[]
```

Fill `GOALS` from spec §6 verbatim. Exercises that don't exist in MoveMore get `u_` ids with `name`, `kind`, `muscles`, `equipment` so the seed can create them: `u_pull_up` (Pull-up, strength, lats/biceps, body only), `u_ring_dip` (Ring dip, strength, chest/triceps, other), `u_false_grip_ring_row`, `u_chest_to_bar_pull_up`, `u_muscle_up_negative`, `u_assisted_muscle_up` (Band-assisted / low-ring muscle up), `u_muscle_up`, `u_floor_pancake`, `u_german_hang`, `u_handstand_hold`, `u_resting_squat`, `u_flat_foot_kneeling`, `u_single_leg_stand`. MoveMore ids used: `mm_pronated_supinated_and_active_hang`, `mm_ring_row_progression`, `mm_ring_support_assisted_or_full`, `mm_standing_and_seated_pike_stretching`, `mm_loaded_butterfly_contract_relax_method_1`, `mm_cross_leg_stretch_progression`, `mm_elevated_pancake_iso_unloaded`, `mm_unilateral_good_morning_cr_only`, `mm_elevated_top_loaded_pancake`, `mm_5_step_horse_stance_with_stick`, `mm_dragon_squat_isometric`. Check the exact slugs in `data/movemore/*.json` and use those.

- [ ] **Step 2: Seed script**

```ts
/**
 * Seed MoveMore exercises, workouts (with blocks) and goal ladders for one user.
 * Run: SEED_USER_EMAIL=you@example.com npm run seed:movemore
 */
import { readFileSync } from "fs";
for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim();
}
import { createClient } from "@supabase/supabase-js";
import type { Programme } from "./movemore/parse";
import { GOALS } from "./movemore/ladders";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } });

async function userIdForEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
  if (!u) throw new Error(`No user with email ${email}`);
  return u.id;
}

async function upsertExercises(userId: string, programmes: Programme[]) { /* merge by id across programmes (union links), upsert with owner_id, kind, source 'movemore', category 'strength'|'stretching', level 'intermediate', primary_muscles [] */ }
async function replaceWorkout(userId: string, name: string, description: string, routine: ProgrammeRoutine) {
  // soft-delete none: hard replace — find workout by (user_id, name, deleted_at null); if exists delete its blocks+exercises; else insert workout.
  // insert blocks (label, sort_order, section, rounds_min, rounds_max, rest_seconds, notes) → ids
  // insert workout_exercises with block_id, sort_order running across blocks, prescription fields, notes
}
async function seedGoals(userId: string) {
  // for each GOALS entry: ensure u_ exercises exist (owner_id=userId, source 'user'); upsert goal by (user_id,name);
  // delete its rungs and reinsert with status: first 'form', rest 'locked'
}
```

Write these three functions in full (no stubs). Workout names: `${phase} · ${routine.name}`; `Movement Projects` (no phase prefix, only once). Description: `${phase} (${dates}) · ${routine.frequency ?? ""}`. Log a one-line summary per workout and goal.

- [ ] **Step 3: Push the migration and run the seed**

```bash
npx supabase db push          # links via supabase/.temp/project-ref; confirm the single new migration
SEED_USER_EMAIL=a.dawson@mu.se npm run seed:movemore
```

Expected: 9 workouts, ~60 exercises, 11 goals (2 ladders + 9 benchmarks). If `db push` asks to log in, run `npx supabase login` first (the owner's browser session) and retry.

- [ ] **Step 4: Verify in SQL (via a quick tsx one-liner using the service key)** — counts of `workout_blocks` per workout match the JSON; `workout_exercises.block_id` is non-null for all seeded rows.

- [ ] **Step 5: Commit** — `git commit -m "feat(movemore): seed exercises, block workouts and goal ladders"`

---

### Task 6: Session set generation

**Files:**
- Create: `src/lib/sessions/build-sets.ts`
- Test: `src/lib/sessions/build-sets.test.ts`
- Modify: `src/app/workouts/[id]/perform/actions.ts` (`startSession`, `updateSet`)

**Interfaces:**
- Produces:

```ts
export interface NewSessionSet {
  exercise_id: string; set_number: number; round_number: number | null; side: "L" | "R" | null;
  reps_completed: number | null; weight_used: number | null; seconds_completed: number | null; completed: false;
}
export function buildSessionSets(
  exercises: Pick<WorkoutExercise, "exercise_id"|"block_id"|"target_sets"|"target_reps"|"target_seconds"|"target_weight"|"each_side">[],
  blocks: Pick<WorkoutBlock, "id"|"rounds_max">[],
): NewSessionSet[]
```

- [ ] **Step 1: Failing tests**

```ts
it("solo exercise: target_sets rows, no rounds", () => {
  const sets = buildSessionSets([{ exercise_id: "a", block_id: null, target_sets: 3, target_reps: 5, target_seconds: null, target_weight: 60, each_side: false }], []);
  expect(sets).toHaveLength(3);
  expect(sets[2]).toMatchObject({ set_number: 3, round_number: null, side: null, reps_completed: 5, weight_used: 60 });
});
it("block exercise: rounds_max × target_sets, with round numbers", () => {
  const sets = buildSessionSets([{ exercise_id: "a", block_id: "b1", target_sets: 1, target_reps: 6, target_seconds: null, target_weight: null, each_side: false }], [{ id: "b1", rounds_max: 3 }]);
  expect(sets.map((s) => [s.set_number, s.round_number])).toEqual([[1,1],[2,2],[3,3]]);
});
it("each side doubles rows with L/R", () => {
  const sets = buildSessionSets([{ exercise_id: "a", block_id: "b1", target_sets: 1, target_reps: null, target_seconds: 30, target_weight: null, each_side: true }], [{ id: "b1", rounds_max: 2 }]);
  expect(sets.map((s) => [s.set_number, s.round_number, s.side, s.seconds_completed])).toEqual([[1,1,"L",30],[2,1,"R",30],[3,2,"L",30],[4,2,"R",30]]);
});
it("unknown block id falls back to one round", () => {
  expect(buildSessionSets([{ exercise_id: "a", block_id: "missing", target_sets: 2, target_reps: 8, target_seconds: null, target_weight: null, each_side: false }], [])).toHaveLength(2);
});
```

- [ ] **Step 2: Implement** (straightforward nested loops; `Math.max(1, target_sets)`).

- [ ] **Step 3: Wire into `startSession`**: select `workout_exercises` with the new columns and `workout_blocks` for the workout; insert `buildSessionSets(...)` rows with `session_id`. Extend `updateSet` data type with `seconds_completed?: number | null`.

- [ ] **Step 4: Run tests, `npm run build`, commit** — `feat(sessions): block-aware set generation`

---

### Task 7: Workout actions and builder with blocks and prescriptions

**Files:**
- Modify: `src/app/workouts/actions.ts` (`WorkoutExerciseInput`, new `WorkoutBlockInput`, `createWorkout`, `updateWorkout`)
- Modify: `src/components/workouts/workout-exercise-row.tsx`
- Create: `src/components/workouts/block-settings.tsx`
- Modify: `src/components/workouts/workout-builder.tsx`
- Modify: `src/app/workouts/[id]/edit/page.tsx`, `edit-client.tsx`, `src/app/workouts/new/page.tsx`
- Create: `src/lib/workouts/blocks.ts` + test `blocks.test.ts` (pure helpers)

**Interfaces:**

```ts
// actions.ts
export interface WorkoutExerciseInput extends Prescription {
  exercise_id: string; sort_order: number; block_label: string | null; notes: string | null;
}
export interface WorkoutBlockInput {
  label: string; section: BlockSection; rounds_min: number; rounds_max: number; rest_seconds: number | null; notes: string | null;
}
export async function createWorkout(name: string, description: string|null, exercises: WorkoutExerciseInput[], blocks: WorkoutBlockInput[])
export async function updateWorkout(workoutId: string, name: string, description: string|null, exercises: WorkoutExerciseInput[], blocks: WorkoutBlockInput[])

// src/lib/workouts/blocks.ts
export const BLOCK_LABELS = ["A","B","C","D","E","F","G","H"] as const;
export function usedLabelsInOrder(exercises: { block_label: string|null; sort_order: number }[]): string[]  // first-appearance order
export function validateWorkout(exercises: WorkoutExerciseInput[], blocks: WorkoutBlockInput[]): string | null  // error message or null
```

- [ ] **Step 1: Tests for `blocks.ts`** — `usedLabelsInOrder` returns `["B","A"]` when B appears first; `validateWorkout` errors: "Block C has no settings", "Block A: rounds min > max", "Seconds required for timed exercise" (mode is inferred: `target_reps == null && target_seconds == null` with a `prescription_text` is allowed; both null and no text → error "Set reps or seconds").

- [ ] **Step 2: Implement helpers; run tests.**

- [ ] **Step 3: Actions** — In both create/update: validate; insert blocks (sort_order = index in `usedLabelsInOrder`) → map label→id; insert exercises with `block_id` from map, spreading all prescription fields. `updateWorkout` deletes `workout_blocks` for the workout first (exercises are deleted already; cascade would null them anyway).

- [ ] **Step 4: Builder row** — Add to `WorkoutExerciseRow`:
  - a segmented toggle `Reps | Time`; Reps mode shows Sets / Reps (min) / Max (optional) / Weight; Time mode shows Sets / Seconds / Weight.
  - a `Block` select (`—`, A…H) writing `block_label`.
  - a `More` disclosure (button toggling local state) with: Tempo (text, placeholder `[3011]`), Method (select: none, iso, CR, DS, accu., pulse, DeR, SD), Each side (checkbox), Prescription text (text), Notes (existing).
  - Under the name, render `formatPrescription(data)` in `text-xs text-zinc-500` so the owner sees the summary live.

- [ ] **Step 5: `BlockSettings` component** — props `{ label, value: WorkoutBlockInput, onChange }`. Renders a compact card: label chip, Section select, Rounds min/max number inputs, Rest seconds input (blank = minimal), Notes. Styled like the row card, `border-orange-500/30`.

- [ ] **Step 6: Builder** — state `blocks: Record<string, WorkoutBlockInput>`. Derive `usedLabelsInOrder(exercises)`; for each used label without settings, create default `{ label, section: "main", rounds_min: 1, rounds_max: 1, rest_seconds: null, notes: null }`. Render block settings cards in a "Blocks" section above the exercise list when any label is used. `onSave(name, description, exercises, blocksArray)`; run `validateWorkout` before calling and show the message.

- [ ] **Step 7: Pages** — `edit/page.tsx` loads `workout_blocks` for the workout and passes them; `edit-client.tsx` maps `block_id` → `block_label` for initial exercises and builds `initialBlocks`; `new/page.tsx` passes through the extra argument.

- [ ] **Step 8: Manual check** — `npm run build`; open a seeded MoveMore workout in the builder: blocks and prescriptions load, save round-trips without loss. Open a 5x5 workout: no blocks shown, unchanged.

- [ ] **Step 9: Commit** — `feat(builder): blocks, timed prescriptions, tempo and method fields`

---

### Task 8: Performer with blocks, hold timer and media

**Files:**
- Create: `src/lib/sessions/group-blocks.ts` + test
- Create: `src/lib/media/signed-urls.ts`
- Create: `src/components/workouts/hold-timer.tsx`
- Create: `src/components/workouts/exercise-media.tsx`
- Create: `src/components/workouts/session-set-row.tsx`
- Modify: `src/components/workouts/active-session.tsx`
- Modify: `src/components/workouts/exercise-info-modal.tsx`
- Modify: `src/app/workouts/[id]/perform/page.tsx`

**Interfaces:**

```ts
// group-blocks.ts
export interface SessionGroup { block: WorkoutBlock | null; exercises: SessionExercise[] }  // SessionExercise as in active-session.tsx
export function groupByBlock(exercises: SessionExercise[], blocks: WorkoutBlock[]): SessionGroup[]
export function isLastExerciseOfRound(group: SessionGroup, exerciseIdx: number): boolean

// signed-urls.ts (server only)
export async function signMedia(supabase: SupabaseClient, media: ExerciseMedia[]): Promise<{ path: string; url: string; kind: "clip"|"own"; label: string }[]>

// hold-timer.tsx
export function HoldTimer({ seconds, onDone }: { seconds: number; onDone: (elapsed: number) => void })
// exercise-media.tsx
export function ExerciseMediaStrip({ media, links }: { media: SignedMedia[]; links: ExerciseLink[] })
```

- [ ] **Step 1: `groupByBlock` tests** — solo exercises become their own group with `block: null`; exercises sharing a block_id are grouped in workout order; blocks ordered by first appearance; `isLastExerciseOfRound` true only for the last exercise in a block group (and always true for solo).

- [ ] **Step 2: Implement `groupByBlock`; `signMedia`** uses `supabase.storage.from("exercise-media").createSignedUrls(paths, 3600)` and maps back; returns `[]` on error.

- [ ] **Step 3: `HoldTimer`** — a button "Start 30s"; on press counts down using an end timestamp (same pattern as the rest timer so it survives backgrounding), shows `0:27`, on reaching 0 calls `navigator.vibrate?.(200)` and `onDone(seconds)`; a "Stop" mid-way calls `onDone(elapsed)`.

- [ ] **Step 4: `ExerciseMediaStrip`** — if `media.length`, a collapsed row "Show clip ▸"; expanded renders `<video src muted loop playsInline autoPlay controls={false} className="w-full rounded-lg">` for the first clip and small thumbnails/buttons to switch between clips and own recordings. Below: links as `<a target="_blank">` "Watch: {label}" (primary label "Full video").

- [ ] **Step 5: `SessionSetRow`** — props `{ set, mode: "reps"|"time", targetSeconds, onChange(field, value), onToggle, onPrefill }`. Reps mode = today's row (weight, reps, tick). Time mode = round/side label, seconds input, `HoldTimer` inline (compact), tick. Side badge `L`/`R` next to set number when present; round number shown as `R2` when `round_number` is set.

- [ ] **Step 6: `ActiveSession`** — accept `blocks: WorkoutBlock[]` and `mediaByExercise: Record<string, SignedMedia[]>`; build `groups = groupByBlock(...)`. Render each group: if `block`, a header strip `Block A · Prep · 1 round` / `Block C · Main · 2-3 rounds · 90s rest`; then the exercise cards as today but with the prescription line (`formatPrescription(workoutExercise)` and `prescription_text` when different) under the name, `ExerciseMediaStrip`, and `SessionSetRow`s. Rest logic in `toggleSet`: for solo groups keep current behaviour; for block groups start the rest timer only when `isLastExerciseOfRound` and use `block.rest_seconds ?? restDuration`. Previous line: `Ns` when `seconds_completed` is set, else `w x r`.

- [ ] **Step 7: Perform page** — also fetch `workout_blocks` (`order("sort_order")`), select `session_sets` with the new columns, collect `exercise.media` for all exercises and `signMedia` them server-side into `mediaByExercise`.

- [ ] **Step 8: Info modal** — after the muscles, render links list and, if present, the media strip (pass signed media through a new optional prop).

- [ ] **Step 9: Manual check in the browser** — perform `B1P1 · SSP A`: blocks render, a 30 s hold counts down and fills seconds, completing A10 starts the block rest; perform a 5x5 workout: identical to before. `npm run build && npm run lint`.

- [ ] **Step 10: Commit** — `feat(performer): blocks, rounds, hold timer, clips and links`

---

### Task 9: Exercise browser, detail and creation

**Files:**
- Modify: `src/app/exercises/page.tsx`, `src/components/exercises/exercise-filters.tsx`, `exercise-card.tsx`, `src/app/exercises/[id]/page.tsx`
- Create: `src/app/exercises/new/page.tsx`, `src/app/exercises/new/new-exercise-form.tsx`, `src/app/exercises/actions.ts`
- Modify: `src/components/workouts/exercise-picker.tsx`

**Interfaces:**

```ts
// actions.ts
export interface NewExerciseInput { name: string; kind: ExerciseKind; primary_muscles: string[]; equipment: string | null; links: ExerciseLink[]; notes: string | null }
export async function createExercise(input: NewExerciseInput): Promise<{ error?: string; id?: string }>
```

- [ ] **Step 1: Filters** — add `kind` select (All kinds / Strength / Mobility / Skill / Project) and a `Mine` toggle chip (`mine=1`). Page applies `.eq("kind", kind)` and `.eq("owner_id", user.id)`; when `mine` is set, order owned first. Header gets a `+ New` link to `/exercises/new`.

- [ ] **Step 2: Card** — kind badge for non-strength kinds (`mobility` teal, `skill` violet, `project` amber) and a small play icon when `links.length || media.length`.

- [ ] **Step 3: Detail page** — for owned exercises: links list (label + "open at 2:31" when `start_seconds`), signed media videos via `signMedia`, notes paragraph. Existing image/instruction sections stay for global ones.

- [ ] **Step 4: New exercise form + action** — client form: name, kind, muscles (multi-select chips from the filter list), equipment, links (repeatable label + URL rows; `start_seconds` derived with `youtubeStart`, move that helper into `src/lib/youtube.ts` and import it in `scripts/movemore/parse.ts`), notes. Action: id `u_` + slugify(name) (`slugify` moves to `src/lib/slug.ts` shared with the parser), `owner_id = user.id`, `source = "user"`, `category` from kind (`mobility` → `stretching` else `strength`), `level = "intermediate"`, `images = []`, `instructions = []`; on conflict return error "You already have an exercise with this name". `revalidatePath("/exercises")`, redirect to the detail page.

- [ ] **Step 5: Picker** — query owned first: run two queries (owned matching, then global matching, 15 each) and concatenate; show kind badge.

- [ ] **Step 6: Build, lint, manual check, commit** — `feat(exercises): kinds, ownership, links, media and creation`

---

### Task 10: Goals pages

**Files:**
- Create: `src/app/goals/page.tsx`, `src/app/goals/goals-client.tsx`, `src/app/goals/actions.ts`
- Create: `src/app/goals/[id]/page.tsx`, `src/app/goals/[id]/goal-client.tsx`, `src/app/goals/[id]/rung-row.tsx`
- Create: `src/lib/goals/transitions.ts` + test
- Modify: `src/components/nav.tsx`, `src/app/page.tsx`

**Interfaces:**

```ts
// transitions.ts
export type RungAction = "start" | "form_ok" | "graduate" | "reopen";
export function nextStatus(current: RungStatus, action: RungAction): RungStatus | null  // null = invalid
export function applyRungAction(rungs: GoalRung[], rungId: string, action: RungAction, now: string): GoalRung[]  // pure; graduate also promotes next locked → form

// actions.ts
export async function rungAction(goalId: string, rungId: string, action: RungAction)
export async function updateRungGraduateWhen(rungId: string, text: string)
export async function addRung(goalId: string, exerciseId: string)          // appended, status locked, graduate_when ""
export async function reorderRungs(goalId: string, orderedIds: string[])
export async function setGoalAchieved(goalId: string, achieved: boolean)
export async function createGoal(input: { name: string; kind: GoalKind; pass_condition: string; description: string|null })
```

- [ ] **Step 1: Transition tests** — table: locked+start→form; form+form_ok→building; building+graduate→maintaining; maintaining+reopen→building; invalid combos → null. `applyRungAction` graduate sets `graduated_at`, and the next `locked` rung (by sort_order) becomes `form` with `started_at = now`; if none, unchanged.

- [ ] **Step 2: Implement transitions; actions** apply the pure function then write the changed rows (`upsert` of the affected rungs) with explicit goal ownership check (`goals.user_id = user.id`); `revalidatePath("/goals")` and `/goals/${goalId}`.

- [ ] **Step 3: `/goals` page** — server: goals (not deleted, `sort_order`) with rungs and exercises; benchmark progress: for goals with `benchmark_exercise_id`, query max `seconds_completed` (or `reps_completed`) from the user's completed sets for that exercise. Client: two sections "Ladders" and "Benchmarks"; goal cards (name, kind chip, active rung name + status pill, benchmark `best / target`, achieved tick), a "New goal" inline form, and a "Build today's session" button (wired in Task 11; render disabled until then).

- [ ] **Step 4: `/goals/[id]` page** — ladder list via @dnd-kit sortable (same wiring as the builder): rung rows with exercise name (link to detail), `formatPrescription`, editable graduate-when (input, saves on blur), status pill and the one valid action button for its status. "Add rung" opens the existing `ExercisePicker`. "Mark achieved / Reopen goal" at the bottom.

- [ ] **Step 5: Nav** — add `Goals` (target icon) between Workouts and Bros. Dashboard: a "Goals" card under quick actions listing each ladder goal with its active rung (link to `/goals`).

- [ ] **Step 6: Build, lint, browser check, commit** — `feat(goals): ladders with rung status transitions`

---

### Task 11: Build today's session from goals

**Files:**
- Create: `src/lib/goals/compose-practice.ts` + test
- Modify: `src/app/goals/actions.ts` (`buildSessionFromGoals`)
- Modify: `src/app/goals/goals-client.tsx` (button + base workout select)

**Interfaces:**

```ts
export interface ComposeInput {
  date: string;                                  // "2026-09-26"
  goals: (Goal & { rungs: GoalRung[] })[];
  base?: { blocks: WorkoutBlock[]; exercises: WorkoutExercise[] } | null;
}
export interface ComposedWorkout { name: string; blocks: WorkoutBlockInput[]; exercises: WorkoutExerciseInput[] }
export function composePractice(input: ComposeInput): ComposedWorkout
```

- [ ] **Step 1: Tests**
  - two goals, one active rung each → blocks `[A main, B main, C auxiliary(maintaining)]` when no base; main blocks `rounds 3 / rest 90`, exercises carry the rung's prescription; auxiliary has `rounds 1 / rest null`.
  - with a base whose blocks are `A prep, B prep, C main, F auxiliary, G finishing`: result order is prep blocks, main (rungs), auxiliary (maintaining + nothing from base), finishing blocks from base; labels re-lettered A… in order; `sort_order` continuous.
  - no active rungs → returns a workout with only base prep/finishing (or empty blocks) and name `Practice · 2026-09-26`.

- [ ] **Step 2: Implement** — collect `active = rungs.filter(status in form|building)` per goal in goal order, `maintaining` likewise; build block list; re-letter with `BLOCK_LABELS`; exercises get `block_label`, `sort_order` incremental, `target_weight: null`, `notes: rung.status === "form" ? "Form focus" : null`.

- [ ] **Step 3: Action** — loads goals+rungs for the user, optional base workout (blocks + exercises, must be owned or shared), calls `composePractice`, then reuses `createWorkout`'s insert logic (extract an internal `insertWorkout(userId, name, description, exercises, blocks)` in `workouts/actions.ts` used by both) and `redirect(`/workouts/${id}/edit`)`.

- [ ] **Step 4: UI** — on `/goals`: a select "Base template (prep & finishing)" listing the user's workouts that have blocks, and the button. Commit — `feat(goals): compose a practice session from active rungs`

---

### Task 12: Media pipeline (clips and uploads)

**Files:**
- Create: `scripts/media/clip.ts`, `scripts/media/upload.ts`, `scripts/media/own-recordings.ts` (mapping table), `scripts/media/README.md`
- Modify: `package.json` scripts: `"media:clip": "tsx scripts/media/clip.ts"`, `"media:upload": "tsx scripts/media/upload.ts"`; `.gitignore` add `media-out/`

**Interfaces:**
- `clip.ts` reads `data/movemore/*.json`; for each exercise link whose url is YouTube: `videoId`, `t = start_seconds ?? 0`; output `media-out/<exercise_id>/<videoId>_<t>.mp4` (skip if exists). Commands:

```bash
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" --download-sections "*${t}-${t+45}" --force-keyframes-at-cuts -o "$TMP/${videoId}_${t}.%(ext)s" "https://www.youtube.com/watch?v=${videoId}"
ffmpeg -y -i "$TMP/<downloaded>" -an -vf "scale=-2:480" -c:v libx264 -preset veryfast -crf 28 -movflags +faststart "media-out/<exercise_id>/<videoId>_<t>.mp4"
```

Use `execFileSync` from `node:child_process`; catch errors per link and print `SKIP <exercise_id> <url>: <first line of stderr>`; print a summary table at the end.
- `own-recordings.ts`: `export const OWN: { file: string; exercise_id: string; label: string }[]` mapping the six MOVs in `/Users/alexdawsonsmac/Desktop/Movement/B1P1/` to `mm_inverted_hang_ext_flex_and_hip_piking`, `mm_lateral_role_back_forth_and_lengths`, `mm_low_bridge_slide`, `mm_protracted_pushup`, `mm_ring_row_progression`, `mm_split_squat` (verify slugs in the JSON), the wrist-routine MP4 to `mm_5_wrist_strength_mobility_routine`, and GIFs A1–A10 in `Upper-body Strength & Mobility/gif/compressed/` to the B1P1 UBSM A1–A10 exercise ids in order (A1 hangs … A10 = first exercise of the next block if the folder has ten; confirm by viewing two GIFs before mapping). Encoded with `-vf "scale=-2:720" -c:v libx264 -crf 26 -c:a aac -b:a 96k` (GIFs: `-an`). Output `media-out/<exercise_id>/own_<slug>.mp4`.
- `upload.ts`: for every file under `media-out/`, upload to `exercise-media` at `<userId>/<exercise_id>/<file>` with `upsert: true`, then merge `{ path, kind: file.startsWith("own_") ? "own" : "clip", label }` into `exercises.media` (dedupe by path). `SEED_USER_EMAIL` resolves the user as in the seed.

- [ ] **Step 1: Install tools** — `brew install yt-dlp ffmpeg` (report versions).
- [ ] **Step 2: Write the three scripts and README.**
- [ ] **Step 3: Run `npm run media:clip`** — expect ~60 clips; note any SKIPs (private videos) in the final report.
- [ ] **Step 4: Run `SEED_USER_EMAIL=… npm run media:upload`** — expect the upload count and `exercises.media` populated; open one exercise detail page and confirm the clip plays.
- [ ] **Step 5: Commit** (scripts only; `media-out/` ignored) — `feat(media): clip and upload pipeline for reference videos`

---

### Task 13: History hold metric and summary tweaks

**Files:**
- Modify: `src/app/history/page.tsx`, `src/components/history/progress-graphs.tsx`, `src/app/workouts/[id]/perform/summary/page.tsx`, `src/components/workouts/workout-summary.tsx`

- [ ] **Step 1: History query** — remove the `.not("weight_used","is",null).not("reps_completed","is",null)` filters; select `seconds_completed` too; keep sets where `weight_used != null || seconds_completed != null`.
- [ ] **Step 2: Graphs** — metric selector gains "Best hold (s)": per date `max(seconds_completed)`; the existing weight metrics filter to sets with weight as before. Exercise list includes exercises that only have seconds.
- [ ] **Step 3: Summary** — per-exercise breakdown shows `top hold Ns` when there is no weight; PR detection for holds: compare max `seconds_completed` against previous sessions the same way weight PRs are computed.
- [ ] **Step 4: Build, lint, commit** — `feat(history): hold-time progress and PRs`

---

### Task 14: Docs, final verification and push

**Files:**
- Modify: `CLAUDE.md` (schema section: new tables/columns, bucket, scripts, tests)

- [ ] **Step 1: Update CLAUDE.md** — add the tables, the `exercise-media` bucket, the scripts (`movemore:parse`, `seed:movemore`, `media:clip`, `media:upload`, `test`), and the rule "existing no-block workouts must keep performing unchanged".
- [ ] **Step 2: Full verification** — `npm test`, `npm run lint`, `npm run build`; in the browser: perform `B1P2 · Upper-body Strength & Mobility` end to end and finish; build a practice from Muscle up + Pancake with `B1P2 · Upper-body Strength & Mobility` as base, save, perform two blocks; perform an old 5x5 workout and finish; check history graphs show a hold metric.
- [ ] **Step 3: Push** — `git push -u origin mobility-goals`; report the Vercel preview URL if the app prints it, otherwise the branch name. Do not merge.

---

## Self-review

- Spec coverage: §3 → Task 1; §4.1 → Task 7; §4.2 → Task 6; §4.3 → Task 8 (+13 for graphs); §4.4 → Task 9; §4.5 → Task 10; §4.6 → Task 11; §5 → Tasks 3–5; §6 → Task 5; §7 → Task 12; §8 error handling is embedded in each task's actions (return `{error}`, fallbacks in build-sets and signMedia); §9 → tests in Tasks 2, 4, 6, 7, 8, 10, 11 and Task 14; §10 → Tasks 5 and 14.
- Type names are consistent: `Prescription`, `WorkoutBlock`, `WorkoutBlockInput`, `WorkoutExerciseInput` (with `block_label`), `SessionSet` (with `seconds_completed`, `side`, `round_number`), `GoalRung`, `RungStatus`, `RungAction`, `ParsedPrescription`, `SignedMedia` (= return element type of `signMedia`).
- Shared helpers: `slugify` in `src/lib/slug.ts`, `youtubeStart` in `src/lib/youtube.ts` (Task 9 moves them; Task 4 may create them there directly to avoid the move).
