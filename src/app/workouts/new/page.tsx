"use client";

import { BottomNav } from "@/components/nav";
import { WorkoutBuilder } from "@/components/workouts/workout-builder";
import { createWorkout } from "@/app/workouts/actions";
import Link from "next/link";

export default function NewWorkoutPage() {
  return (
    <div className="min-h-screen pb-20">
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
        <h1 className="text-2xl font-bold">Create Workout</h1>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <WorkoutBuilder
          onSave={async (name, description, exercises) => {
            const result = await createWorkout(name, description, exercises);
            if (result?.error) return result;
          }}
          saveLabel="Create Workout"
        />
      </main>

      <BottomNav />
    </div>
  );
}
