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

export type ExerciseKind = "strength" | "mobility" | "skill" | "project";

export interface ExerciseLink {
  label: string;
  url: string;
  start_seconds: number | null;
}

export interface ExerciseMedia {
  path: string;
  kind: "clip" | "own";
  label: string;
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
  owner_id: string | null;
  kind: ExerciseKind;
  source: string;
  links: ExerciseLink[];
  media: ExerciseMedia[];
  notes: string | null;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type BlockSection = "prep" | "main" | "auxiliary" | "finishing";

export interface WorkoutBlock {
  id: string;
  workout_id: string;
  label: string;
  sort_order: number;
  section: BlockSection;
  rounds_min: number;
  rounds_max: number;
  rest_seconds: number | null;
  notes: string | null;
}

export type PrescriptionMethod =
  | "iso"
  | "cr"
  | "ds"
  | "accu"
  | "pulse"
  | "der"
  | "sd";

/** What to do for one exercise: sets, reps or seconds, tempo, method. */
export interface Prescription {
  target_sets: number;
  target_reps: number | null;
  target_reps_max: number | null;
  target_seconds: number | null;
  target_weight: number | null;
  tempo: string | null;
  method: PrescriptionMethod | null;
  each_side: boolean;
  prescription_text: string | null;
}

export interface WorkoutExercise extends Prescription {
  id: string;
  workout_id: string;
  exercise_id: string;
  sort_order: number;
  block_id: string | null;
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
  deleted_at: string | null;
  workout?: Workout;
}

export interface SessionSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number | null;
  weight_used: number | null;
  seconds_completed: number | null;
  side: "L" | "R" | null;
  round_number: number | null;
  completed: boolean;
  completed_at: string | null;
  exercise?: Exercise;
}

export interface WorkoutReaction {
  id: string;
  session_id: string;
  user_id: string;
  reaction: "💪" | "🔥" | "🏆" | "😤";
  created_at: string;
}

export type GoalKind = "strength" | "mobility";

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  kind: GoalKind;
  description: string | null;
  pass_condition: string;
  benchmark_exercise_id: string | null;
  benchmark_target_seconds: number | null;
  benchmark_target_reps: number | null;
  sort_order: number;
  achieved_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export type RungStatus = "locked" | "form" | "building" | "maintaining";

export interface GoalRung
  extends Omit<Prescription, "target_sets" | "target_weight"> {
  id: string;
  goal_id: string;
  sort_order: number;
  exercise_id: string;
  target_sets: number | null;
  graduate_when: string;
  status: RungStatus;
  started_at: string | null;
  graduated_at: string | null;
  exercise?: Exercise;
}
