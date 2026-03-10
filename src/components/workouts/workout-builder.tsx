"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ExercisePicker } from "./exercise-picker";
import { WorkoutExerciseRow } from "./workout-exercise-row";
import type { Exercise } from "@/lib/types/database";
import type { WorkoutExerciseInput } from "@/app/workouts/actions";

interface ExerciseWithData {
  exercise: Exercise;
  data: WorkoutExerciseInput;
}

interface Props {
  initialName?: string;
  initialDescription?: string;
  initialExercises?: ExerciseWithData[];
  onSave: (
    name: string,
    description: string | null,
    exercises: WorkoutExerciseInput[]
  ) => Promise<{ error?: string } | void>;
  saveLabel?: string;
}

export function WorkoutBuilder({
  initialName = "",
  initialDescription = "",
  initialExercises = [],
  onSave,
  saveLabel = "Save Workout",
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [exercises, setExercises] = useState<ExerciseWithData[]>(initialExercises);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setExercises((prev) => {
        const oldIndex = prev.findIndex(
          (e) => e.exercise.id === active.id
        );
        const newIndex = prev.findIndex(
          (e) => e.exercise.id === over.id
        );
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function addExercise(exercise: Exercise) {
    setExercises((prev) => [
      ...prev,
      {
        exercise,
        data: {
          exercise_id: exercise.id,
          sort_order: prev.length,
          target_sets: 3,
          target_reps: 10,
          target_weight: null,
          notes: null,
        },
      },
    ]);
  }

  function updateExercise(index: number, update: Partial<WorkoutExerciseInput>) {
    setExercises((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, data: { ...item.data, ...update } }
          : item
      )
    );
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Workout name is required");
      return;
    }
    if (exercises.length === 0) {
      setError("Add at least one exercise");
      return;
    }

    setSaving(true);
    setError(null);

    const orderedExercises = exercises.map((e, i) => ({
      ...e.data,
      sort_order: i,
    }));

    const result = await onSave(
      name.trim(),
      description.trim() || null,
      orderedExercises
    );

    if (result?.error) {
      setError(result.error);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Workout Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push Day, Leg Day"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this workout"
            rows={2}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">
            Exercises ({exercises.length})
          </h2>
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add
          </button>
        </div>

        {exercises.length === 0 ? (
          <button
            onClick={() => setPickerOpen(true)}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 p-8 text-zinc-500 transition-colors hover:border-orange-500/50 hover:text-zinc-400"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-sm">Add your first exercise</span>
          </button>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={exercises.map((e) => e.exercise.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {exercises.map((item, index) => (
                  <WorkoutExerciseRow
                    key={item.exercise.id}
                    id={item.exercise.id}
                    exercise={item.exercise}
                    data={item.data}
                    onUpdate={(update) => updateExercise(index, update)}
                    onRemove={() => removeExercise(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
      >
        {saving ? "Saving..." : saveLabel}
      </button>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={addExercise}
        selectedIds={exercises.map((e) => e.exercise.id)}
      />
    </div>
  );
}
