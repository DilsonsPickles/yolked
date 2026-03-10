"use client";

import Link from "next/link";
import { WorkoutBuilder } from "@/components/workouts/workout-builder";
import { updateWorkout, deleteWorkout } from "@/app/workouts/actions";
import type { Workout, WorkoutExercise, Exercise } from "@/lib/types/database";

interface Props {
  workout: Workout;
  workoutExercises: (WorkoutExercise & { exercise: Exercise })[];
}

export function EditWorkoutClient({ workout, workoutExercises }: Props) {
  const initialExercises = workoutExercises.map((we) => ({
    exercise: we.exercise,
    data: {
      exercise_id: we.exercise_id,
      sort_order: we.sort_order,
      target_sets: we.target_sets,
      target_reps: we.target_reps,
      target_weight: we.target_weight,
      notes: we.notes,
    },
  }));

  return (
    <>
      <header className="border-b border-zinc-800 px-4 py-4">
        <Link
          href="/workouts"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Edit Workout</h1>
          <button
            onClick={async () => {
              if (confirm("Delete this workout?")) {
                await deleteWorkout(workout.id);
              }
            }}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <WorkoutBuilder
          initialName={workout.name}
          initialDescription={workout.description || ""}
          initialExercises={initialExercises}
          onSave={async (name, description, exercises) => {
            const result = await updateWorkout(
              workout.id,
              name,
              description,
              exercises
            );
            if (result?.error) return result;
          }}
          saveLabel="Save Changes"
        />
      </main>
    </>
  );
}
