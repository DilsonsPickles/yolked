"use client";

import type { WorkoutBlockInput } from "@/app/workouts/actions";
import type { BlockSection } from "@/lib/types/database";
import { SECTION_LABEL } from "@/lib/workouts/blocks";

interface Props {
  value: WorkoutBlockInput;
  exerciseCount: number;
  onChange: (update: Partial<WorkoutBlockInput>) => void;
}

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none";

export function BlockSettings({ value, exerciseCount, onChange }: Props) {
  return (
    <div className="rounded-xl border border-orange-500/30 bg-zinc-900 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-sm font-bold text-orange-400">
          {value.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">Block {value.label}</p>
          <p className="text-xs text-zinc-500">
            {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"} · done as rounds,
            minimal rest inside the block
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="col-span-1">
          <label className="mb-1 block text-xs text-zinc-500">Section</label>
          <select
            value={value.section}
            onChange={(e) => onChange({ section: e.target.value as BlockSection })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-200 focus:border-orange-500 focus:outline-none"
          >
            {(Object.keys(SECTION_LABEL) as BlockSection[]).map((s) => (
              <option key={s} value={s}>
                {SECTION_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Rounds</label>
          <input
            type="number"
            min={1}
            max={10}
            value={value.rounds_min}
            onChange={(e) => {
              const v = Math.max(1, parseInt(e.target.value) || 1);
              onChange({ rounds_min: v, rounds_max: Math.max(v, value.rounds_max) });
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">to</label>
          <input
            type="number"
            min={1}
            max={10}
            value={value.rounds_max}
            onChange={(e) => {
              const v = Math.max(1, parseInt(e.target.value) || 1);
              onChange({ rounds_max: v, rounds_min: Math.min(v, value.rounds_min) });
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Rest (s)</label>
          <input
            type="number"
            min={0}
            step={15}
            value={value.rest_seconds ?? ""}
            onChange={(e) =>
              onChange({ rest_seconds: e.target.value ? parseInt(e.target.value) : null })
            }
            placeholder="min."
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
