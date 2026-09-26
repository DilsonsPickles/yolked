-- Mobility & Goals: owned exercises with links/media, workout blocks,
-- richer prescriptions, timed set logging, goal ladders, private media bucket.
-- Additive only: existing workouts and sessions keep working unchanged.

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
    or exists (
      select 1 from public.workout_shares s
      where s.workout_id = workout_blocks.workout_id and s.shared_with_user_id = auth.uid()
    )
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
