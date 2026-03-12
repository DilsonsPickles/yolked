-- Workout reactions: bros can react to each other's completed sessions
create table if not exists workout_reactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('💪', '🔥', '🏆', '😤')),
  created_at timestamptz default now(),
  -- One reaction per user per session
  unique (session_id, user_id)
);

-- Enable RLS
alter table workout_reactions enable row level security;

-- Users can see reactions on their own sessions or sessions from bros
create policy "Users can view reactions on own sessions"
  on workout_reactions for select
  using (
    -- The session belongs to you
    exists (
      select 1 from workout_sessions ws
      where ws.id = workout_reactions.session_id
      and ws.user_id = auth.uid()
    )
    or
    -- You are the one who reacted
    user_id = auth.uid()
    or
    -- The session belongs to one of your bros
    exists (
      select 1 from workout_sessions ws
      join bros b on b.bro_id = ws.user_id and b.user_id = auth.uid()
      where ws.id = workout_reactions.session_id
    )
  );

-- Users can insert reactions on bro sessions (not their own)
create policy "Users can react to bro sessions"
  on workout_reactions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from workout_sessions ws
      join bros b on b.bro_id = ws.user_id and b.user_id = auth.uid()
      where ws.id = workout_reactions.session_id
      and ws.completed_at is not null
      and ws.deleted_at is null
    )
  );

-- Users can delete their own reactions
create policy "Users can remove own reactions"
  on workout_reactions for delete
  using (user_id = auth.uid());
