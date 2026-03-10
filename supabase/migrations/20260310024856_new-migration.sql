-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Exercises (seeded from Free Exercise DB)
CREATE TABLE public.exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  force TEXT,
  level TEXT NOT NULL,
  mechanic TEXT,
  equipment TEXT,
  primary_muscles TEXT[] NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  instructions TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  images TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_exercises_name ON public.exercises USING gin(to_tsvector('english', name));
CREATE INDEX idx_exercises_category ON public.exercises(category);
CREATE INDEX idx_exercises_equipment ON public.exercises(equipment);
CREATE INDEX idx_exercises_primary_muscles ON public.exercises USING gin(primary_muscles);

-- Workouts (user-created templates)
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workouts_user ON public.workouts(user_id);

-- Workout Exercises (template contents)
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES public.exercises(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 10,
  target_weight NUMERIC,
  notes TEXT
);

CREATE INDEX idx_workout_exercises_workout ON public.workout_exercises(workout_id);

-- Workout Sessions (performed instances)
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON public.workout_sessions(user_id);
CREATE INDEX idx_sessions_date ON public.workout_sessions(started_at);
CREATE INDEX idx_sessions_workout ON public.workout_sessions(workout_id);

-- Session Sets (individual set logs)
CREATE TABLE public.session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES public.exercises(id),
  set_number INTEGER NOT NULL,
  reps_completed INTEGER,
  weight_used NUMERIC,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(session_id, exercise_id, set_number)
);

CREATE INDEX idx_session_sets_session ON public.session_sets(session_id);
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Exercises (public read for all authenticated users)
CREATE POLICY "Exercises are viewable by authenticated users"
  ON public.exercises FOR SELECT TO authenticated USING (true);

-- Workouts
CREATE POLICY "Users can view own workouts"
  ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create workouts"
  ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts"
  ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts"
  ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Workout Exercises
CREATE POLICY "Users can view own workout exercises"
  ON public.workout_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert workout exercises"
  ON public.workout_exercises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own workout exercises"
  ON public.workout_exercises FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own workout exercises"
  ON public.workout_exercises FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid()));

-- Workout Sessions
CREATE POLICY "Users can view own sessions"
  ON public.workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create sessions"
  ON public.workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions"
  ON public.workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions"
  ON public.workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- Session Sets
CREATE POLICY "Users can view own session sets"
  ON public.session_sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert session sets"
  ON public.session_sets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own session sets"
  ON public.session_sets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own session sets"
  ON public.session_sets FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = session_id AND user_id = auth.uid()));
