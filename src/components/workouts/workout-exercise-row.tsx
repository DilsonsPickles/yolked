"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Exercise } from "@/lib/types/database";
import type { WorkoutExerciseInput } from "@/app/workouts/actions";

interface Props {
  exercise: Exercise;
  data: WorkoutExerciseInput;
  onUpdate: (data: Partial<WorkoutExerciseInput>) => void;
  onRemove: () => void;
  id: string;
}

export function WorkoutExerciseRow({
  exercise,
  data,
  onUpdate,
  onRemove,
  id,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-white">
            {exercise.name}
          </h3>
          <p className="text-xs text-zinc-500">
            {exercise.primary_muscles.join(", ")}
          </p>
        </div>

        <button
          onClick={onRemove}
          className="rounded-lg p-1 text-zinc-600 hover:text-red-400"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Sets</label>
          <input
            type="number"
            min={1}
            max={20}
            value={data.target_sets}
            onChange={(e) =>
              onUpdate({ target_sets: parseInt(e.target.value) || 1 })
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-sm text-white focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Reps</label>
          <input
            type="number"
            min={1}
            max={100}
            value={data.target_reps}
            onChange={(e) =>
              onUpdate({ target_reps: parseInt(e.target.value) || 1 })
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-sm text-white focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Weight</label>
          <input
            type="number"
            min={0}
            step={2.5}
            value={data.target_weight || ""}
            onChange={(e) =>
              onUpdate({
                target_weight: e.target.value
                  ? parseFloat(e.target.value)
                  : null,
              })
            }
            placeholder="kg"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-3">
        <input
          type="text"
          value={data.notes || ""}
          onChange={(e) => onUpdate({ notes: e.target.value || null })}
          placeholder="Notes (e.g. use Smith machine)"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
