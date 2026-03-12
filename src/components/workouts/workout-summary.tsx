"use client";

import { useRouter } from "next/navigation";

interface ExerciseSummary {
  name: string;
  sets: number;
  topWeight: number | null;
  topReps: number | null;
  isPR: boolean;
}

interface Props {
  workoutName: string;
  durationMinutes: number;
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  exercises: ExerciseSummary[];
  volumeChange: number | null; // percentage vs last session, null if no previous
  weekCount: number; // how many workouts this week including this one
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function WorkoutSummary({
  workoutName,
  durationMinutes,
  totalVolume,
  completedSets,
  totalSets,
  exercises,
  volumeChange,
  weekCount,
}: Props) {
  const router = useRouter();
  const prs = exercises.filter((e) => e.isPR);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mb-2 text-4xl">💪</div>
          <h1 className="text-2xl font-bold text-white">Workout Complete!</h1>
          <p className="mt-1 text-zinc-400">{workoutName}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500">Duration</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {durationMinutes}
              <span className="text-sm font-normal text-zinc-400">min</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500">Sets</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {completedSets}
              <span className="text-sm font-normal text-zinc-400">
                /{totalSets}
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500">Volume</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {totalVolume > 0 ? totalVolume.toLocaleString() : "—"}
              {totalVolume > 0 && (
                <span className="text-sm font-normal text-zinc-400">kg</span>
              )}
            </p>
            {volumeChange !== null && totalVolume > 0 && (
              <p
                className={`mt-1 text-xs font-medium ${
                  volumeChange > 0
                    ? "text-green-400"
                    : volumeChange < 0
                      ? "text-red-400"
                      : "text-zinc-500"
                }`}
              >
                {volumeChange > 0 ? "↑" : volumeChange < 0 ? "↓" : ""}
                {volumeChange > 0 ? "+" : ""}
                {Math.round(volumeChange)}% vs last
              </p>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500">This Week</p>
            <p className="mt-1 text-2xl font-bold text-orange-500">
              {ordinal(weekCount)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">workout</p>
          </div>
        </div>

        {/* PRs */}
        {prs.length > 0 && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <h2 className="font-semibold text-orange-400">
                New Personal Record{prs.length > 1 ? "s" : ""}!
              </h2>
            </div>
            <div className="space-y-2">
              {prs.map((pr, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2"
                >
                  <span className="text-sm text-white">{pr.name}</span>
                  <span className="text-sm font-bold text-orange-400">
                    {pr.topWeight}kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise breakdown */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-400">
            Exercise Breakdown
          </h2>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-300">{ex.name}</span>
                <span className="text-zinc-500">
                  {ex.sets} sets
                  {ex.topWeight ? ` · ${ex.topWeight}kg` : ""}
                  {ex.topReps ? ` × ${ex.topReps}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Done button */}
        <button
          onClick={() => router.push("/")}
          className="w-full rounded-xl bg-orange-500 py-4 text-center font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Done
        </button>
      </div>
    </div>
  );
}
