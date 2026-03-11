-- Add soft delete support to workouts table
ALTER TABLE public.workouts
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial indexes for efficient queries
CREATE INDEX idx_workouts_not_deleted ON public.workouts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workouts_deleted ON public.workouts(user_id, deleted_at) WHERE deleted_at IS NOT NULL;

-- Update owns_workout() to exclude soft-deleted workouts
CREATE OR REPLACE FUNCTION public.owns_workout(wid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workouts
    WHERE id = wid AND user_id = auth.uid() AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
