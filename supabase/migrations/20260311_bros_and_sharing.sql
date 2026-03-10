-- ============================================================
-- Bros + Shared Workouts Migration
-- ============================================================

-- 1. Add share_code to profiles
ALTER TABLE public.profiles
  ADD COLUMN share_code TEXT UNIQUE;

-- Backfill existing profiles with random 6-char codes
UPDATE public.profiles
SET share_code = upper(substr(md5(random()::text || id::text), 1, 6))
WHERE share_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN share_code SET NOT NULL,
  ALTER COLUMN share_code SET DEFAULT upper(substr(md5(random()::text), 1, 6));

-- 2. Update handle_new_user trigger to include share_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, share_code)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    upper(substr(md5(random()::text || NEW.id::text), 1, 6))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create bros table (bidirectional)
CREATE TABLE public.bros (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bro_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, bro_id),
  CHECK (user_id <> bro_id)
);

CREATE INDEX idx_bros_user ON public.bros(user_id);
CREATE INDEX idx_bros_bro ON public.bros(bro_id);

ALTER TABLE public.bros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bros"
  ON public.bros FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove bros"
  ON public.bros FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = bro_id);

-- 4. Create workout_shares table
CREATE TABLE public.workout_shares (
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workout_id, shared_with_user_id)
);

CREATE INDEX idx_workout_shares_user ON public.workout_shares(shared_with_user_id);
CREATE INDEX idx_workout_shares_workout ON public.workout_shares(workout_id);

ALTER TABLE public.workout_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view workout shares"
  ON public.workout_shares FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workouts
    WHERE id = workout_id AND user_id = auth.uid()
  ));

CREATE POLICY "Shared users can view their shares"
  ON public.workout_shares FOR SELECT
  USING (auth.uid() = shared_with_user_id);

CREATE POLICY "Owners can share workouts"
  ON public.workout_shares FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workouts
    WHERE id = workout_id AND user_id = auth.uid()
  ));

CREATE POLICY "Owners can unshare workouts"
  ON public.workout_shares FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workouts
    WHERE id = workout_id AND user_id = auth.uid()
  ));

-- 5. Lookup profile by share code (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.lookup_profile_by_share_code(code TEXT)
RETURNS TABLE(id UUID, display_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.display_name
  FROM public.profiles p
  WHERE p.share_code = upper(code)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add bro function (SECURITY DEFINER to insert both directions)
CREATE OR REPLACE FUNCTION public.add_bro(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.bros (user_id, bro_id)
  VALUES (auth.uid(), target_user_id), (target_user_id, auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Make workout_sessions.workout_id nullable (preserve history on workout deletion)
ALTER TABLE public.workout_sessions
  ALTER COLUMN workout_id DROP NOT NULL;

ALTER TABLE public.workout_sessions
  DROP CONSTRAINT workout_sessions_workout_id_fkey,
  ADD CONSTRAINT workout_sessions_workout_id_fkey
    FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE SET NULL;

-- 8. Update RLS policies to include shared access

-- Profiles: allow viewing bros' profiles
DROP POLICY "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile and bros"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.bros
      WHERE user_id = auth.uid() AND bro_id = profiles.id
    )
  );

-- Workouts: allow viewing shared workouts
DROP POLICY "Users can view own workouts" ON public.workouts;
CREATE POLICY "Users can view own or shared workouts"
  ON public.workouts FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.workout_shares
      WHERE workout_id = workouts.id AND shared_with_user_id = auth.uid()
    )
  );

-- Workout exercises: allow viewing exercises from shared workouts
DROP POLICY "Users can view own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can view own or shared workout exercises"
  ON public.workout_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workouts
    WHERE id = workout_exercises.workout_id
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.workout_shares
        WHERE workout_id = workout_exercises.workout_id
        AND shared_with_user_id = auth.uid()
      )
    )
  ));
