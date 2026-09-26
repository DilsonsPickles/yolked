"use client";

import type { SessionSet } from "@/lib/types/database";
import { HoldTimer } from "./hold-timer";

export type SetField = "reps_completed" | "weight_used" | "seconds_completed";

interface Props {
  set: SessionSet;
  mode: "reps" | "time";
  /** Show round numbers (block exercises) instead of plain set numbers. */
  inBlock: boolean;
  targetSeconds: number | null;
  onChange: (field: SetField, value: number | null) => void;
  onToggle: () => void;
  onPrefillWeight: () => void;
}

const inputClass =
  "w-full rounded bg-zinc-800 px-2 py-1.5 text-center text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500";

export function SessionSetRow({
  set,
  mode,
  inBlock,
  targetSeconds,
  onChange,
  onToggle,
  onPrefillWeight,
}: Props) {
  const label = inBlock && set.round_number ? `R${set.round_number}` : `${set.set_number}`;

  return (
    <div
      className={`grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2 rounded-lg p-2 transition-colors ${
        set.completed ? "bg-green-500/10" : "bg-zinc-800/50"
      }`}
    >
      <div className="flex flex-col items-center leading-tight">
        <span
          className={`text-sm font-bold ${set.completed ? "text-green-500" : "text-zinc-500"}`}
        >
          {label}
        </span>
        {set.side && (
          <span className="rounded bg-zinc-700 px-1 text-[10px] font-semibold text-zinc-300">
            {set.side}
          </span>
        )}
      </div>

      {mode === "reps" ? (
        <>
          <input
            type="number"
            value={set.weight_used ?? ""}
            onChange={(e) =>
              onChange("weight_used", e.target.value ? parseFloat(e.target.value) : null)
            }
            onBlur={onPrefillWeight}
            placeholder="—"
            aria-label="Weight"
            className={inputClass}
          />
          <input
            type="number"
            value={set.reps_completed ?? ""}
            onChange={(e) =>
              onChange("reps_completed", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="—"
            aria-label="Reps"
            className={inputClass}
          />
        </>
      ) : (
        <>
          <input
            type="number"
            value={set.seconds_completed ?? ""}
            onChange={(e) =>
              onChange("seconds_completed", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="s"
            aria-label="Seconds held"
            className={inputClass}
          />
          <div className="flex justify-center">
            {targetSeconds && targetSeconds > 0 ? (
              <HoldTimer
                compact
                seconds={targetSeconds}
                onDone={(elapsed) => {
                  onChange("seconds_completed", elapsed);
                  if (elapsed >= targetSeconds && !set.completed) onToggle();
                }}
              />
            ) : (
              <span className="text-xs text-zinc-600">—</span>
            )}
          </div>
        </>
      )}

      <button
        onClick={onToggle}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          set.completed
            ? "bg-green-500 text-white"
            : "border border-zinc-600 text-zinc-600 hover:border-green-500 hover:text-green-500"
        }`}
        aria-label={set.completed ? "Mark set incomplete" : "Mark set complete"}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </button>
    </div>
  );
}
