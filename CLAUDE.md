# Yolked — Workout Builder & Tracker PWA

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack, Server Components & Actions)
- **Language**: TypeScript 5 (strict mode, `@/*` path alias → `src/*`)
- **Database**: Supabase (Postgres, RLS, Auth with @supabase/ssr)
- **Styling**: Tailwind CSS 4 — dark theme, zinc/orange color scheme
- **PWA**: Serwist (service worker in `src/app/sw.ts`)
- **Drag & Drop**: @dnd-kit (used in workout builder)

## Commands
- `npm run dev` — dev server on port 3001
- `npm run build` — production build (always run to check for type errors)
- `npm run lint` — ESLint
- `npm test` — vitest unit tests (pure modules under `src/lib` and `scripts`)
- `npx supabase db push` — push migrations to Supabase
- `npm run movemore:parse` — raw MoveMore extraction → `data/movemore/*.json`
- `SEED_USER_EMAIL=… npm run seed:movemore` — seed MoveMore exercises, block workouts and goal ladders for one user
- `npm run media:clip` / `SEED_USER_EMAIL=… npm run media:upload` — reference clips → private `exercise-media` bucket (see `scripts/media/README.md`)

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Project Structure
```
src/
├── app/
│   ├── page.tsx              # Dashboard (redirects to /login if unauthenticated)
│   ├── login/                # Auth (sign in / sign up)
│   ├── workouts/             # CRUD + perform workouts
│   │   ├── page.tsx          # List (server) → workouts-client.tsx (client)
│   │   ├── actions.ts        # shareWorkout, unshareWorkout
│   │   ├── [id]/edit/        # Workout builder (owner only)
│   │   └── [id]/perform/     # Active session with rest timer
│   ├── exercises/            # Exercise browser (free-exercise-db seed + owned exercises), /new creates owned ones
│   ├── goals/                # Goal ladders (rungs: locked → form → building → maintaining), "Build today's session"
│   ├── history/              # Calendar view of completed sessions
│   ├── bros/                 # Bros system (share codes, add/remove bros)
│   └── ~offline/             # PWA offline fallback
├── components/
│   ├── nav.tsx               # Bottom navigation bar
│   ├── goals-card.tsx        # Dashboard goals summary
│   ├── exercises/kind-badge.tsx
│   └── workouts/
│       ├── active-session.tsx # Workout performer: groups exercises by block, rest per round
│       ├── session-set-row.tsx / hold-timer.tsx / exercise-media.tsx
│       ├── workout-builder.tsx / workout-exercise-row.tsx / block-settings.tsx
│       └── share-workout-dialog.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client (createBrowserClient)
│   │   ├── server.ts         # Server client (createServerClient + cookies)
│   │   └── middleware.ts     # Session refresh
│   ├── prescription.ts       # parse/format "6-8x [3012]"-style prescriptions (tested)
│   ├── sessions/             # build-sets (set pre-creation), group-blocks (performer grouping)
│   ├── goals/                # transitions (rung status machine), compose-practice (session from ladders)
│   ├── workouts/             # blocks helpers + validation, insert-contents (shared insert)
│   ├── media/signed-urls.ts  # signed URLs for the private media bucket (server only)
│   └── types/
│       └── database.ts       # All TypeScript interfaces
└── middleware.ts              # Supabase session management
scripts/movemore/              # PDF extraction (Python), parse.ts (tested), ladders.ts, README
scripts/media/                 # clip.ts, upload.ts, own-recordings.ts, README
data/movemore/                 # committed extraction + parsed programmes (B1P1, B1P2)
```

## Database Schema
**Core tables**: profiles, workouts, workout_blocks, workout_exercises, exercises, workout_sessions, session_sets
**Goal tables**: goals, goal_rungs
**Social tables**: bros (bidirectional), workout_shares
**Storage**: private bucket `exercise-media`, objects at `<user_id>/<exercise_id>/<file>`, read via signed URLs only

Key details:
- `workout_sessions.workout_id` is nullable (ON DELETE SET NULL preserves history)
- RLS policies enforce user isolation + bro sharing
- `owns_workout()` SECURITY DEFINER function breaks RLS circular references
- `add_bro()` and `lookup_profile_by_share_code()` are SECURITY DEFINER functions
- All session/history queries must include explicit `.eq("user_id", user.id)` — do NOT rely on RLS alone for session data
- `exercises.owner_id` null = global seed, otherwise owned (`mm_*` MoveMore, `u_*` user-created); select policy is "global or mine"
- `workout_blocks` group exercises into lettered rounds (A1, A2…) with section, rounds range and rest; `workout_exercises.block_id` null = straight sets exactly as before — **existing no-block workouts must keep performing unchanged**
- Prescriptions: `target_reps` is nullable; timed work uses `target_seconds`; `tempo`, `method`, `each_side`, `prescription_text` are optional extras. `session_sets` has `seconds_completed`, `side`, `round_number`

## Key Patterns
- **Server Components** fetch data, **Client Components** handle interactivity
- **Server Actions** (actions.ts) for all mutations — use `revalidatePath` after writes
- **Supabase auth** via cookies (middleware refreshes sessions on every request)
- **Shared workouts** are single source of truth — bros see the same workout row, only owner can edit
- **Weight prefill**: on blur of weight input, subsequent empty sets auto-fill (active-session.tsx)
- **Loading spinners**: all async buttons (Sign In, Start, Finish) show spinner during server calls

## Deployment
- **Hosting**: Vercel (auto-deploys from GitHub, preview deploys on branches)
- **Database**: Supabase project ref `wvqmqgyyikegqriqokam`
- **GitHub**: DilsonsPickles/yolked
- **Note**: `gh` CLI is not installed — PRs must be created via GitHub web UI

## Migrations
Located in `supabase/migrations/`. Use sequential date prefixes (e.g. `20260313_feature_name.sql`).
Push with `npx supabase db push`.
