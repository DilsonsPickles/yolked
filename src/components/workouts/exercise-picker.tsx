"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types/database";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (exercise: Exercise) => void;
  selectedIds: string[];
}

export function ExercisePicker({ open, onClose, onAdd, selectedIds }: Props) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();

      let q = supabase
        .from("exercises")
        .select("*")
        .order("name")
        .limit(30);

      if (query) {
        q = q.ilike("name", `%${query}%`);
      }
      if (muscle) {
        q = q.contains("primary_muscles", [muscle]);
      }

      const { data } = await q;
      setExercises((data as Exercise[]) || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [open, query, muscle]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-900 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h2 className="text-lg font-semibold">Add Exercise</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises..."
            autoFocus
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Muscles</option>
            {[
              "abdominals", "biceps", "calves", "chest", "forearms",
              "glutes", "hamstrings", "lats", "lower back", "middle back",
              "quadriceps", "shoulders", "traps", "triceps",
            ].map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-800" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {exercises.map((exercise) => {
                const alreadyAdded = selectedIds.includes(exercise.id);
                return (
                  <button
                    key={exercise.id}
                    onClick={() => {
                      if (!alreadyAdded) {
                        onAdd(exercise);
                        onClose();
                      }
                    }}
                    disabled={alreadyAdded}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      alreadyAdded
                        ? "border-zinc-700 bg-zinc-800/50 opacity-50"
                        : "border-zinc-800 bg-zinc-900 hover:border-orange-500/50"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold uppercase text-orange-500">
                      {exercise.primary_muscles[0]?.slice(0, 3) || "???"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {exercise.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {exercise.primary_muscles.join(", ")}
                        {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                      </p>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-xs text-zinc-500">Added</span>
                    ) : (
                      <svg className="h-5 w-5 shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
