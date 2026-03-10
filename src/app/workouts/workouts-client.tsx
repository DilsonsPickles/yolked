"use client";

import { useState } from "react";
import Link from "next/link";
import { ShareWorkoutDialog } from "@/components/workouts/share-workout-dialog";

interface WorkoutRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  workout_exercises: { count: number }[];
  owner: { display_name: string | null } | null;
}

interface Props {
  myWorkouts: WorkoutRow[];
  sharedWorkouts: WorkoutRow[];
}

export function WorkoutsClient({ myWorkouts, sharedWorkouts }: Props) {
  const [shareDialog, setShareDialog] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      {/* My Workouts */}
      {myWorkouts.length > 0 ? (
        <div className="space-y-3">
          {myWorkouts.map((workout) => {
            const exerciseCount =
              workout.workout_exercises?.[0]?.count ?? 0;
            return (
              <div
                key={workout.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      {workout.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setShareDialog({ id: workout.id, name: workout.name })
                      }
                      className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                      title="Share"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0-12.814a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0 12.814a2.25 2.25 0 1 0 3.933 2.185 2.25 2.25 0 0 0-3.933-2.185Z"
                        />
                      </svg>
                    </button>
                    <Link
                      href={`/workouts/${workout.id}/edit`}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/workouts/${workout.id}/perform`}
                      className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                    >
                      Start
                    </Link>
                  </div>
                </div>
                {workout.description && (
                  <p className="mt-2 text-sm text-zinc-400">
                    {workout.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <svg
            className="h-12 w-12 text-zinc-700"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <div>
            <p className="font-medium text-zinc-400">No workouts yet</p>
            <p className="mt-1 text-sm text-zinc-600">
              Create your first workout template
            </p>
          </div>
          <Link
            href="/workouts/new"
            className="rounded-lg bg-orange-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Create Workout
          </Link>
        </div>
      )}

      {/* Shared Workouts */}
      {sharedWorkouts.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-200">
            Shared with You
          </h2>
          <div className="space-y-3">
            {sharedWorkouts.map((workout) => {
              const exerciseCount =
                workout.workout_exercises?.[0]?.count ?? 0;
              const ownerName =
                (workout.owner as unknown as { display_name: string | null })
                  ?.display_name || "Someone";
              return (
                <div
                  key={workout.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        {workout.name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {exerciseCount} exercise
                        {exerciseCount !== 1 ? "s" : ""} &middot; Shared by{" "}
                        {ownerName}
                      </p>
                    </div>
                    <Link
                      href={`/workouts/${workout.id}/perform`}
                      className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                    >
                      Start
                    </Link>
                  </div>
                  {workout.description && (
                    <p className="mt-2 text-sm text-zinc-400">
                      {workout.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {shareDialog && (
        <ShareWorkoutDialog
          open
          onClose={() => setShareDialog(null)}
          workoutId={shareDialog.id}
          workoutName={shareDialog.name}
        />
      )}
    </>
  );
}
