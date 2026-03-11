"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateSet, completeSession } from "@/app/workouts/[id]/perform/actions";
import type { Exercise, SessionSet, WorkoutExercise } from "@/lib/types/database";

interface SessionExercise {
  exercise: Exercise;
  workoutExercise: WorkoutExercise;
  sets: SessionSet[];
}

interface Props {
  sessionId: string;
  workoutName: string;
  exercises: SessionExercise[];
  startedAt: string;
  previousSetsByExercise: Record<string, SessionSet[]>;
}

export function ActiveSession({
  sessionId,
  workoutName,
  exercises: initialExercises,
  startedAt,
  previousSetsByExercise,
}: Props) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [sessionNotes, setSessionNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restDuration, setRestDuration] = useState(180); // 3 minutes default

  // Workout timer
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Rest timer
  useEffect(() => {
    if (restSeconds <= 0) return;
    const interval = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restSeconds]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.completed).length,
    0
  );

  const toggleSet = useCallback(
    async (exerciseIdx: number, setIdx: number) => {
      const wasCompleted = exercises[exerciseIdx].sets[setIdx].completed;

      setExercises((prev) =>
        prev.map((ex, eIdx) =>
          eIdx === exerciseIdx
            ? {
                ...ex,
                sets: ex.sets.map((s, sIdx) =>
                  sIdx === setIdx ? { ...s, completed: !s.completed } : s
                ),
              }
            : ex
        )
      );

      // Start rest timer when completing a set (not when unchecking)
      if (!wasCompleted) {
        setRestSeconds(restDuration);
      }

      const set = exercises[exerciseIdx].sets[setIdx];
      await updateSet(set.id, { completed: !set.completed });
    },
    [exercises, restDuration]
  );

  const updateSetValue = useCallback(
    async (
      exerciseIdx: number,
      setIdx: number,
      field: "reps_completed" | "weight_used",
      value: number | null
    ) => {
      setExercises((prev) =>
        prev.map((ex, eIdx) =>
          eIdx === exerciseIdx
            ? {
                ...ex,
                sets: ex.sets.map((s, sIdx) =>
                  sIdx === setIdx ? { ...s, [field]: value } : s
                ),
              }
            : ex
        )
      );

      const set = exercises[exerciseIdx].sets[setIdx];
      await updateSet(set.id, { [field]: value });
    },
    [exercises]
  );

  const prefillWeight = useCallback(
    (exerciseIdx: number, setIdx: number) => {
      const currentSet = exercises[exerciseIdx].sets[setIdx];
      const weight = currentSet.weight_used;
      if (weight === null || weight === undefined) return;

      const setsToFill = exercises[exerciseIdx].sets
        .slice(setIdx + 1)
        .filter((s) => s.weight_used === null);

      if (setsToFill.length === 0) return;

      // Update local state for all empty subsequent sets at once
      setExercises((prev) =>
        prev.map((ex, eIdx) =>
          eIdx === exerciseIdx
            ? {
                ...ex,
                sets: ex.sets.map((s, sIdx) =>
                  sIdx > setIdx && s.weight_used === null
                    ? { ...s, weight_used: weight }
                    : s
                ),
              }
            : ex
        )
      );

      // Persist each to the database
      for (const s of setsToFill) {
        updateSet(s.id, { weight_used: weight });
      }
    },
    [exercises]
  );

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const result = await completeSession(sessionId, sessionNotes || null);
      if (result?.error) {
        console.error("Failed to complete session:", result.error);
        setFinishing(false);
        return;
      }
      window.location.href = "/workouts";
    } catch (err) {
      console.error("Error finishing workout:", err);
      setFinishing(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{workoutName}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-zinc-400">
              <span className="font-mono">{formatTime(elapsed)}</span>
              <span>
                {completedSets}/{totalSets} sets
              </span>
            </div>
          </div>
          <button
            onClick={handleFinish}
            disabled={finishing}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {finishing && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {finishing ? "Saving..." : "Finish"}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-300"
            style={{
              width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%`,
            }}
          />
        </div>

        {/* Rest timer */}
        {restSeconds > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-500/10 border border-blue-500/30 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-400">Rest</span>
              <span className="font-mono text-lg font-bold text-blue-300">
                {Math.floor(restSeconds / 60)}:{(restSeconds % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRestSeconds(0)}
                className="rounded px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/20"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Rest duration selector (shown when no timer running) */}
        {restSeconds === 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-zinc-500">Rest:</span>
            {[60, 90, 120, 180, 300].map((secs) => (
              <button
                key={secs}
                onClick={() => setRestDuration(secs)}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  restDuration === secs
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Exercises */}
      <main className="mx-auto max-w-lg space-y-6 p-4">
        {exercises.map((exerciseGroup, exerciseIdx) => (
          <div
            key={exerciseGroup.exercise.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900"
          >
            <div className="border-b border-zinc-800 p-4">
              <h2 className="font-semibold text-white">
                {exerciseGroup.exercise.name}
              </h2>
              <p className="text-xs text-zinc-500">
                {exerciseGroup.exercise.primary_muscles.join(", ")}
                {exerciseGroup.exercise.equipment
                  ? ` · ${exerciseGroup.exercise.equipment}`
                  : ""}
              </p>
              {exerciseGroup.workoutExercise.notes && (
                <p className="mt-2 rounded bg-zinc-800 px-2 py-1 text-xs text-orange-400">
                  {exerciseGroup.workoutExercise.notes}
                </p>
              )}
            </div>

            {/* Previous session data */}
            {previousSetsByExercise[exerciseGroup.exercise.id] && (
              <div className="border-b border-zinc-800 px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-zinc-500">Previous</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {previousSetsByExercise[exerciseGroup.exercise.id].map((ps) => (
                      <span key={ps.id} className="text-xs text-zinc-500">
                        {ps.weight_used ?? "—"} x {ps.reps_completed ?? "—"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Set headers */}
            <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2 px-4 pt-3 text-xs text-zinc-500">
              <span className="text-center">Set</span>
              <span className="text-center">Weight</span>
              <span className="text-center">Reps</span>
              <span className="text-center">
                <svg className="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </span>
            </div>

            {/* Sets */}
            <div className="p-4 pt-2 space-y-2">
              {exerciseGroup.sets.map((set, setIdx) => (
                <div
                  key={set.id}
                  className={`grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2 rounded-lg p-2 transition-colors ${
                    set.completed ? "bg-green-500/10" : "bg-zinc-800/50"
                  }`}
                >
                  <span
                    className={`text-center text-sm font-bold ${
                      set.completed ? "text-green-500" : "text-zinc-500"
                    }`}
                  >
                    {set.set_number}
                  </span>
                  <input
                    type="number"
                    value={set.weight_used ?? ""}
                    onChange={(e) =>
                      updateSetValue(
                        exerciseIdx,
                        setIdx,
                        "weight_used",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    onBlur={() => prefillWeight(exerciseIdx, setIdx)}
                    placeholder="—"
                    className="w-full rounded bg-zinc-800 px-2 py-1.5 text-center text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <input
                    type="number"
                    value={set.reps_completed ?? ""}
                    onChange={(e) =>
                      updateSetValue(
                        exerciseIdx,
                        setIdx,
                        "reps_completed",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder="—"
                    className="w-full rounded bg-zinc-800 px-2 py-1.5 text-center text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => toggleSet(exerciseIdx, setIdx)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      set.completed
                        ? "bg-green-500 text-white"
                        : "border border-zinc-600 text-zinc-600 hover:border-green-500 hover:text-green-500"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Session notes */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Session Notes
          </label>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="How did it go? Any injuries, gym observations..."
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </main>
    </div>
  );
}
