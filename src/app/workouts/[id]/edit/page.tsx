import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { BottomNav } from "@/components/nav";
import { EditWorkoutClient } from "./edit-client";
import type { Exercise, WorkoutExercise } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditWorkoutPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workout } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!workout) {
    notFound();
  }

  // Only the owner can edit
  if (workout.user_id !== user?.id) {
    redirect(`/workouts/${id}/perform`);
  }

  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("*, exercise:exercises(*)")
    .eq("workout_id", id)
    .order("sort_order");

  return (
    <div className="min-h-screen pb-20">
      <EditWorkoutClient
        workout={workout}
        workoutExercises={(workoutExercises as (WorkoutExercise & { exercise: Exercise })[]) || []}
      />
      <BottomNav />
    </div>
  );
}
