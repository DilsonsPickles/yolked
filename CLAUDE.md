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
- `npx supabase db push` — push migrations to Supabase

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
│   ├── exercises/            # Exercise browser (seeded from free-exercise-db)
│   ├── history/              # Calendar view of completed sessions
│   ├── bros/                 # Bros system (share codes, add/remove bros)
│   └── ~offline/             # PWA offline fallback
├── components/
│   ├── nav.tsx               # Bottom navigation bar
│   └── workouts/
│       ├── active-session.tsx # Workout performer (client component)
│       └── share-workout-dialog.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client (createBrowserClient)
│   │   ├── server.ts         # Server client (createServerClient + cookies)
│   │   └── middleware.ts     # Session refresh
│   └── types/
│       └── database.ts       # All TypeScript interfaces
└── middleware.ts              # Supabase session management
```

## Database Schema
**Core tables**: profiles, workouts, workout_exercises, exercises, workout_sessions, session_sets
**Social tables**: bros (bidirectional), workout_shares

Key details:
- `workout_sessions.workout_id` is nullable (ON DELETE SET NULL preserves history)
- RLS policies enforce user isolation + bro sharing
- `owns_workout()` SECURITY DEFINER function breaks RLS circular references
- `add_bro()` and `lookup_profile_by_share_code()` are SECURITY DEFINER functions
- All session/history queries must include explicit `.eq("user_id", user.id)` — do NOT rely on RLS alone for session data

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
