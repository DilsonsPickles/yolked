export interface Profile {
  id: string;
  display_name: string | null;
  share_code: string;
  created_at: string;
  updated_at: string;
}

export interface Bro {
  user_id: string;
  bro_id: string;
  created_at: string;
  profile?: Profile;
}

export interface WorkoutShare {
  workout_id: string;
  shared_with_user_id: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sort_order: number;
  target_sets: number;
  target_reps: number;
  target_weight: number | null;
  notes: string | null;
  exercise?: Exercise;
}

export interface WorkoutSession {
  id: string;
  workout_id: string | null;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  workout?: Workout;
}

export interface SessionSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number | null;
  weight_used: number | null;
  completed: boolean;
  completed_at: string | null;
  exercise?: Exercise;
}
