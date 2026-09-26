"use client";

import { useState } from "react";
import Link from "next/link";
import { WorkoutBuilder } from "@/components/workouts/workout-builder";
import { updateWorkout, deleteWorkout } from "@/app/workouts/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Workout, WorkoutBlock, WorkoutExercise, Exercise } from "@/lib/types/database";
import type { WorkoutBlockInput } from "@/app/workouts/actions";

interface Props {
  workout: Workout;
  workoutExercises: (WorkoutExercise & { exercise: Exercise })[];
  blocks: WorkoutBlock[];
}

export function EditWorkoutClient({ workout, workoutExercises, blocks }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  const labelById = new Map(blocks.map((b) => [b.id, b.label]));

  const initialExercises = workoutExercises.map((we) => ({
    exercise: we.exercise,
    data: {
      exercise_id: we.exercise_id,
      sort_order: we.sort_order,
      block_label: we.block_id ? (labelById.get(we.block_id) ?? null) : null,
      target_sets: we.target_sets,
      target_reps: we.target_reps,
      target_reps_max: we.target_reps_max,
      target_seconds: we.target_seconds,
      target_weight: we.target_weight,
      tempo: we.tempo,
      method: we.method,
      each_side: we.each_side,
      prescription_text: we.prescription_text,
      notes: we.notes,
    },
  }));

  const initialBlocks: WorkoutBlockInput[] = blocks.map((b) => ({
    label: b.label,
    section: b.section,
    rounds_min: b.rounds_min,
    rounds_max: b.rounds_max,
    rest_seconds: b.rest_seconds,
    notes: b.notes,
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
            onClick={() => setShowConfirm(true)}
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
          initialBlocks={initialBlocks}
          onSave={async (name, description, exercises, blocks) => {
            const result = await updateWorkout(
              workout.id,
              name,
              description,
              exercises,
              blocks
            );
            if (result?.error) return result;
          }}
          saveLabel="Save Changes"
        />
      </main>

      <ConfirmDialog
        open={showConfirm}
        title="Delete Workout"
        message="Delete this workout? You can restore it from Recently Deleted within 30 days."
        confirmLabel="Delete"
        onConfirm={async () => {
          setShowConfirm(false);
          await deleteWorkout(workout.id);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
