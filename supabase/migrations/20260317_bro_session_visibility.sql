-- Allow users to see completed sessions from their bros (for activity feed)
-- Drop the existing select policy and replace with one that includes bros
drop policy if exists "Users can view own sessions" on public.workout_sessions;

create policy "Users can view own and bro sessions"
  on public.workout_sessions for select
  using (
    auth.uid() = user_id
    or (
      -- Session belongs to a bro AND is completed (not in-progress)
      completed_at is not null
      and deleted_at is null
      and exists (
        select 1 from bros
        where bros.user_id = auth.uid()
        and bros.bro_id = workout_sessions.user_id
      )
    )
  );
