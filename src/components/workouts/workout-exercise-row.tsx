"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Exercise, PrescriptionMethod } from "@/lib/types/database";
import type { WorkoutExerciseInput } from "@/app/workouts/actions";
import { formatPrescription } from "@/lib/prescription";
import { BLOCK_LABELS } from "@/lib/workouts/blocks";

interface Props {
  exercise: Exercise;
  data: WorkoutExerciseInput;
  onUpdate: (data: Partial<WorkoutExerciseInput>) => void;
  onRemove: () => void;
  id: string;
}

const METHODS: { value: PrescriptionMethod | ""; label: string }[] = [
  { value: "", label: "Method" },
  { value: "iso", label: "Isometric hold" },
  { value: "cr", label: "Contract / relax" },
  { value: "ds", label: "Drop set" },
  { value: "accu", label: "Accumulated" },
  { value: "pulse", label: "Pulses" },
  { value: "der", label: "Descending reps" },
  { value: "sd", label: "Self-directed" },
];

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none";
const textClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none";

export function WorkoutExerciseRow({
  exercise,
  data,
  onUpdate,
  onRemove,
  id,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const [more, setMore] = useState(
    Boolean(data.tempo || data.method || data.each_side || data.prescription_text)
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const mode: "reps" | "time" =
    data.target_reps == null && data.target_seconds != null ? "time" : "reps";

  function setMode(next: "reps" | "time") {
    if (next === mode) return;
    if (next === "time") {
      onUpdate({
        target_reps: null,
        target_reps_max: null,
        target_seconds: data.target_seconds ?? 30,
      });
    } else {
      onUpdate({ target_seconds: null, target_reps: data.target_reps ?? 10 });
    }
  }

  const summary = formatPrescription(data);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-zinc-600 hover:text-zinc-400"
          aria-label="Drag to reorder"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-white">{exercise.name}</h3>
          <p className="truncate text-xs text-zinc-500">
            {summary || exercise.primary_muscles.join(", ")}
          </p>
        </div>

        <select
          value={data.block_label ?? ""}
          onChange={(e) => onUpdate({ block_label: e.target.value || null })}
          aria-label="Block"
          className={`shrink-0 rounded-lg border px-2 py-1.5 text-sm focus:outline-none ${
            data.block_label
              ? "border-orange-500/40 bg-orange-500/10 font-semibold text-orange-400"
              : "border-zinc-700 bg-zinc-800 text-zinc-400"
          }`}
        >
          <option value="">—</option>
          {BLOCK_LABELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <button
          onClick={onRemove}
          className="rounded-lg p-1 text-zinc-600 hover:text-red-400"
          aria-label={`Remove ${exercise.name}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Mode toggle */}
      <div className="mt-3 flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-zinc-700 p-0.5 text-xs">
          {(["reps", "time"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                mode === m ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {m === "reps" ? "Reps" : "Time"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
        >
          {more ? "Less ▴" : "More ▾"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Sets</label>
          <input
            type="number"
            min={1}
            max={20}
            value={data.target_sets}
            onChange={(e) => onUpdate({ target_sets: parseInt(e.target.value) || 1 })}
            className={inputClass}
          />
        </div>
        {mode === "reps" ? (
          <>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Reps</label>
              <input
                type="number"
                min={1}
                max={200}
                value={data.target_reps ?? ""}
                onChange={(e) =>
                  onUpdate({ target_reps: e.target.value ? parseInt(e.target.value) : null })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Max</label>
              <input
                type="number"
                min={1}
                max={200}
                value={data.target_reps_max ?? ""}
                onChange={(e) =>
                  onUpdate({
                    target_reps_max: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="—"
                className={inputClass}
              />
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-zinc-500">Seconds</label>
            <input
              type="number"
              min={1}
              max={3600}
              step={5}
              value={data.target_seconds ?? ""}
              onChange={(e) =>
                onUpdate({ target_seconds: e.target.value ? parseInt(e.target.value) : null })
              }
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Weight</label>
          <input
            type="number"
            min={0}
            step={2.5}
            value={data.target_weight ?? ""}
            onChange={(e) =>
              onUpdate({ target_weight: e.target.value ? parseFloat(e.target.value) : null })
            }
            placeholder="kg"
            className={inputClass}
          />
        </div>
      </div>

      {more && (
        <div className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Tempo</label>
              <input
                type="text"
                value={data.tempo ?? ""}
                onChange={(e) => onUpdate({ tempo: e.target.value || null })}
                placeholder="[3011]"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Method</label>
              <select
                value={data.method ?? ""}
                onChange={(e) =>
                  onUpdate({ method: (e.target.value || null) as PrescriptionMethod | null })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-200 focus:border-orange-500 focus:outline-none"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={data.each_side}
              onChange={(e) => onUpdate({ each_side: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-orange-500"
            />
            Each side
          </label>
          <input
            type="text"
            value={data.prescription_text ?? ""}
            onChange={(e) => onUpdate({ prescription_text: e.target.value || null })}
            placeholder="Prescription as written (e.g. DS: 20”, 15”, 10” holds)"
            className={textClass}
          />
        </div>
      )}

      <div className="mt-3">
        <input
          type="text"
          value={data.notes || ""}
          onChange={(e) => onUpdate({ notes: e.target.value || null })}
          placeholder="Notes (e.g. use Smith machine)"
          className={textClass}
        />
      </div>
    </div>
  );
}
