-- Fix infinite recursion: workout_shares policies referenced workouts,
-- and workouts policies referenced workout_shares, creating a loop.
-- Solution: SECURITY DEFINER function bypasses RLS when checking ownership.

CREATE OR REPLACE FUNCTION public.owns_workout(wid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workouts WHERE id = wid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Recreate workout_shares policies without circular references
DROP POLICY "Owners can view workout shares" ON public.workout_shares;
DROP POLICY "Owners can share workouts" ON public.workout_shares;
DROP POLICY "Owners can unshare workouts" ON public.workout_shares;

CREATE POLICY "Owners can view workout shares"
  ON public.workout_shares FOR SELECT
  USING (public.owns_workout(workout_id));

CREATE POLICY "Owners can share workouts"
  ON public.workout_shares FOR INSERT
  WITH CHECK (public.owns_workout(workout_id));

CREATE POLICY "Owners can unshare workouts"
  ON public.workout_shares FOR DELETE
  USING (public.owns_workout(workout_id));
