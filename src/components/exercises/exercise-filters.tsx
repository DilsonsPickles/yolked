"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

const MUSCLE_GROUPS = [
  "abdominals", "abductors", "adductors", "biceps", "calves",
  "chest", "forearms", "glutes", "hamstrings", "lats",
  "lower back", "middle back", "neck", "quadriceps",
  "shoulders", "traps", "triceps",
];

const EQUIPMENT = [
  "barbell", "body only", "cable", "dumbbell", "e-z curl bar",
  "exercise ball", "foam roll", "kettlebells", "machine",
  "medicine ball", "other", "bands",
];

const CATEGORIES = [
  "cardio", "olympic weightlifting", "plyometrics", "powerlifting",
  "strength", "stretching", "strongman",
];

interface Props {
  currentQuery?: string;
  currentMuscle?: string;
  currentEquipment?: string;
  currentCategory?: string;
}

export function ExerciseFilters({
  currentQuery,
  currentMuscle,
  currentEquipment,
  currentCategory,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery || "");

  useEffect(() => {
    setQuery(currentQuery || "");
  }, [currentQuery]);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/exercises?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query !== (currentQuery || "")) {
        updateFilter("q", query);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, currentQuery, updateFilter]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises..."
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      />

      <div className="flex gap-2 overflow-x-auto">
        <select
          value={currentMuscle || ""}
          onChange={(e) => updateFilter("muscle", e.target.value)}
          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Muscles</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={currentEquipment || ""}
          onChange={(e) => updateFilter("equipment", e.target.value)}
          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Equipment</option>
          {EQUIPMENT.map((e) => (
            <option key={e} value={e}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={currentCategory || ""}
          onChange={(e) => updateFilter("category", e.target.value)}
          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
