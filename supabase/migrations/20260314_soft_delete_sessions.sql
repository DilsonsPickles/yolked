-- Add soft delete support to workout_sessions table
ALTER TABLE public.workout_sessions
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial indexes for efficient queries
CREATE INDEX idx_sessions_not_deleted ON public.workout_sessions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_deleted ON public.workout_sessions(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
