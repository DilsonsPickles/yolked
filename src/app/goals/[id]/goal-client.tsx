"use client";

import { useState } from "react";
import Link from "next/link";
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
import type { Exercise, Goal, GoalRung } from "@/lib/types/database";
import type { RungAction } from "@/lib/goals/transitions";
import {
  addRung,
  deleteGoal,
  removeRung,
  reorderRungs,
  rungAction,
  setGoalAchieved,
  updateRungGraduateWhen,
} from "@/app/goals/actions";
import { ExercisePicker } from "@/components/workouts/exercise-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RungRow } from "./rung-row";

type RungWithExercise = GoalRung & { exercise: Exercise };

interface Props {
  goal: Goal & { benchmark: { id: string; name: string } | null };
  rungs: RungWithExercise[];
}

export function GoalClient({ goal, rungs: initialRungs }: Props) {
  const [rungs, setRungs] = useState(initialRungs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function run(fn: () => Promise<{ error?: string } | void>) {
    setBusy(true);
    setError(null);
    const result = await fn();
    if (result?.error) setError(result.error);
    setBusy(false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rungs.findIndex((r) => r.id === active.id);
    const newIndex = rungs.findIndex((r) => r.id === over.id);
    const next = arrayMove(rungs, oldIndex, newIndex);
    setRungs(next);
    await run(() => reorderRungs(goal.id, next.map((r) => r.id)));
  }

  const achieved = Boolean(goal.achieved_at);
  const done = rungs.filter((r) => r.status === "maintaining").length;

  return (
    <>
      <header className="border-b border-zinc-800 px-4 py-4">
        <Link
          href="/goals"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Goals
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{goal.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">{goal.pass_condition}</p>
            {goal.description && (
              <p className="mt-1 text-xs text-zinc-500">{goal.description}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize ${
              goal.kind === "strength" ? "bg-orange-500/10 text-orange-400" : "bg-teal-500/10 text-teal-300"
            }`}
          >
            {goal.kind}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 p-4">
        {goal.benchmark && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
            Benchmark exercise:{" "}
            <Link href={`/exercises/${goal.benchmark.id}`} className="font-medium text-white hover:text-orange-300">
              {goal.benchmark.name}
            </Link>
            {goal.benchmark_target_seconds && (
              <span className="text-zinc-500">
                {" "}
                · target {goal.benchmark_target_seconds >= 60
                  ? `${goal.benchmark_target_seconds / 60} min`
                  : `${goal.benchmark_target_seconds}s`}
              </span>
            )}
            <p className="mt-1 text-xs text-zinc-500">
              Progress is read from your logged holds of this exercise. Add it to a workout in
              time mode to track it.
            </p>
          </div>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">
              Ladder ({done}/{rungs.length})
            </h2>
            <button
              onClick={() => setPickerOpen(true)}
              disabled={busy}
              className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add rung
            </button>
          </div>

          {rungs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
              No rungs yet. Add the first exercise on the path to this goal.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rungs.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {rungs.map((r, i) => (
                    <RungRow
                      key={r.id}
                      rung={r}
                      index={i}
                      busy={busy}
                      onAction={(action: RungAction) => run(() => rungAction(goal.id, r.id, action))}
                      onGraduateWhen={(text) => run(() => updateRungGraduateWhen(goal.id, r.id, text))}
                      onRemove={() => {
                        setRungs((prev) => prev.filter((x) => x.id !== r.id));
                        run(() => removeRung(goal.id, r.id));
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => run(() => setGoalAchieved(goal.id, !achieved))}
            disabled={busy}
            className={`flex-1 rounded-lg py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
              achieved
                ? "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {achieved ? "Reopen goal" : "Mark achieved"}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="rounded-lg border border-red-500/30 px-4 py-3 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </main>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={(exercise) => run(() => addRung(goal.id, exercise.id))}
        selectedIds={rungs.map((r) => r.exercise_id)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Goal"
        message="Delete this goal and its ladder? Logged sessions are kept."
        confirmLabel="Delete"
        onConfirm={async () => {
          setConfirmDelete(false);
          await deleteGoal(goal.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
