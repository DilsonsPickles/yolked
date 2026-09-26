"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { updateSet, completeSession } from "@/app/workouts/[id]/perform/actions";
import type {
  Exercise,
  SessionSet,
  WorkoutBlock,
  WorkoutExercise,
} from "@/lib/types/database";
import type { SignedMedia } from "@/lib/media/signed-urls";
import { formatPrescription } from "@/lib/prescription";
import { groupByBlock, isLastExerciseOfRound } from "@/lib/sessions/group-blocks";
import { SECTION_LABEL } from "@/lib/workouts/blocks";
import { ExerciseInfoModal } from "@/components/workouts/exercise-info-modal";
import { ExerciseMediaStrip } from "@/components/workouts/exercise-media";
import { SessionSetRow, type SetField } from "@/components/workouts/session-set-row";

export interface SessionExercise {
  exercise: Exercise;
  workoutExercise: WorkoutExercise;
  sets: SessionSet[];
}

interface Props {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  exercises: SessionExercise[];
  blocks: WorkoutBlock[];
  mediaByExercise: Record<string, SignedMedia[]>;
  startedAt: string;
  previousSetsByExercise: Record<string, SessionSet[]>;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function blockHeading(block: WorkoutBlock) {
  const rounds =
    block.rounds_min === block.rounds_max
      ? `${block.rounds_min} round${block.rounds_min === 1 ? "" : "s"}`
      : `${block.rounds_min}-${block.rounds_max} rounds`;
  const rest = block.rest_seconds ? `${block.rest_seconds}s rest` : "minimal rest";
  return `${SECTION_LABEL[block.section]} · ${rounds} · ${rest}`;
}

function previousSummary(sets: SessionSet[]) {
  return sets.map((ps) =>
    ps.seconds_completed != null && ps.reps_completed == null
      ? `${ps.seconds_completed}s${ps.side ? ps.side : ""}`
      : `${ps.weight_used ?? "—"} x ${ps.reps_completed ?? "—"}`
  );
}

export function ActiveSession({
  sessionId,
  workoutId,
  workoutName,
  exercises: initialExercises,
  blocks,
  mediaByExercise,
  startedAt,
  previousSetsByExercise,
}: Props) {
  const [exercises, setExercises] = useState(initialExercises);
  const [sessionNotes, setSessionNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [restEndTime, setRestEndTime] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restDuration, setRestDuration] = useState(180); // 3 minutes default
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);

  // Index of each exercise in the flat list, keyed by exercise id, so groups
  // can hand updates back to the flat state.
  const indexById = useMemo(
    () => new Map(exercises.map((e, i) => [e.exercise.id, i])),
    [exercises]
  );
  const groups = useMemo(
    () =>
      groupByBlock(
        exercises.map((e) => ({
          exercise_id: e.exercise.id,
          block_id: e.workoutExercise.block_id,
          item: e,
        })),
        blocks
      ),
    [exercises, blocks]
  );

  // Workout timer
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Rest timer — uses end timestamp so it survives background throttling
  useEffect(() => {
    if (!restEndTime) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
      setRestSeconds(remaining);
      if (remaining <= 0) setRestEndTime(null);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [restEndTime]);

  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.completed).length,
    0
  );

  const toggleSet = useCallback(
    async (exerciseIdx: number, setIdx: number, restAfter: number | null) => {
      const set = exercises[exerciseIdx].sets[setIdx];
      const wasCompleted = set.completed;

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
      if (!wasCompleted && restAfter !== null) {
        setRestEndTime(Date.now() + restAfter * 1000);
      }

      await updateSet(set.id, { completed: !wasCompleted });
    },
    [exercises]
  );

  const updateSetValue = useCallback(
    async (exerciseIdx: number, setIdx: number, field: SetField, value: number | null) => {
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

      setExercises((prev) =>
        prev.map((ex, eIdx) =>
          eIdx === exerciseIdx
            ? {
                ...ex,
                sets: ex.sets.map((s, sIdx) =>
                  sIdx > setIdx && s.weight_used === null ? { ...s, weight_used: weight } : s
                ),
              }
            : ex
        )
      );

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
      window.location.href = `/workouts/${workoutId}/perform/summary?session=${sessionId}`;
    } catch (err) {
      console.error("Error finishing workout:", err);
      setFinishing(false);
    }
  };

  function renderExercise(
    group: (typeof groups)[number],
    exerciseInGroupIdx: number,
    item: SessionExercise
  ) {
    const exerciseIdx = indexById.get(item.exercise.id)!;
    const we = item.workoutExercise;
    const mode: "reps" | "time" =
      we.target_reps == null && we.target_seconds != null ? "time" : "reps";
    const inBlock = group.block !== null;
    const restAfter = inBlock
      ? isLastExerciseOfRound(group, exerciseInGroupIdx)
        ? (group.block!.rest_seconds ?? restDuration)
        : null
      : restDuration;
    const summary = formatPrescription(we);
    const showText = we.prescription_text && we.prescription_text !== summary;
    const media = mediaByExercise[item.exercise.id] ?? [];
    const previous = previousSetsByExercise[item.exercise.id];

    return (
      <div
        key={item.exercise.id}
        className={`rounded-xl border bg-zinc-900 ${
          inBlock ? "border-zinc-800/80" : "border-zinc-800"
        }`}
      >
        <div className="border-b border-zinc-800 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-semibold text-white">
                {inBlock && (
                  <span className="mr-1.5 text-xs font-bold text-orange-400">
                    {group.block!.label}
                    {exerciseInGroupIdx + 1}
                  </span>
                )}
                {item.exercise.name}
              </h2>
              {summary && (
                <p className="text-xs font-medium text-zinc-300">{summary}</p>
              )}
              {showText && (
                <p className="text-xs text-zinc-500">{we.prescription_text}</p>
              )}
              {!summary && !showText && (
                <p className="text-xs text-zinc-500">
                  {item.exercise.primary_muscles.join(", ")}
                  {item.exercise.equipment ? ` · ${item.exercise.equipment}` : ""}
                </p>
              )}
            </div>
            <button
              onClick={() => setInfoExercise(item.exercise)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              aria-label={`Info for ${item.exercise.name}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </button>
          </div>
          {we.notes && (
            <p className="mt-2 rounded bg-zinc-800 px-2 py-1 text-xs text-orange-400">
              {we.notes}
            </p>
          )}
          {(media.length > 0 || item.exercise.links.length > 0) && (
            <div className="mt-2">
              <ExerciseMediaStrip media={media} links={item.exercise.links} />
            </div>
          )}
        </div>

        {previous && (
          <div className="border-b border-zinc-800 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-zinc-500">Previous</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {previousSummary(previous).map((t, i) => (
                  <span key={i} className="text-xs text-zinc-500">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2 px-4 pt-3 text-xs text-zinc-500">
          <span className="text-center">{inBlock ? "Round" : "Set"}</span>
          {mode === "reps" ? (
            <>
              <span className="text-center">Weight</span>
              <span className="text-center">Reps</span>
            </>
          ) : (
            <>
              <span className="text-center">Seconds</span>
              <span className="text-center">Timer</span>
            </>
          )}
          <span className="text-center">
            <svg className="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </span>
        </div>

        <div className="space-y-2 p-4 pt-2">
          {item.sets.map((set, setIdx) => (
            <SessionSetRow
              key={set.id}
              set={set}
              mode={mode}
              inBlock={inBlock}
              targetSeconds={we.target_seconds}
              onChange={(field, value) => updateSetValue(exerciseIdx, setIdx, field, value)}
              onToggle={() => toggleSet(exerciseIdx, setIdx, restAfter)}
              onPrefillWeight={() => prefillWeight(exerciseIdx, setIdx)}
            />
          ))}
        </div>
      </div>
    );
  }

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
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {finishing ? "Saving..." : "Finish"}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-300"
            style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
          />
        </div>

        {/* Rest timer */}
        {restSeconds > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-400">Rest</span>
              <span className="font-mono text-lg font-bold text-blue-300">
                {Math.floor(restSeconds / 60)}:{(restSeconds % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <button
              onClick={() => {
                setRestEndTime(null);
                setRestSeconds(0);
              }}
              className="rounded px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/20"
            >
              Skip
            </button>
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

      {/* Exercises, grouped by block */}
      <main className="mx-auto max-w-lg space-y-6 p-4">
        {groups.map((group, gIdx) =>
          group.block ? (
            <section key={group.block.id} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-sm font-bold text-orange-400">
                  {group.block.label}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Block {group.block.label}</p>
                  <p className="truncate text-xs text-zinc-500">{blockHeading(group.block)}</p>
                </div>
              </div>
              {group.exercises.map((g, i) => renderExercise(group, i, g.item))}
            </section>
          ) : (
            <div key={`solo-${gIdx}-${group.exercises[0].exercise_id}`}>
              {renderExercise(group, 0, group.exercises[0].item)}
            </div>
          )
        )}

        {/* Session notes */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">Session Notes</label>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="How did it go? Any injuries, gym observations..."
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </main>

      {infoExercise && (
        <ExerciseInfoModal
          exercise={infoExercise}
          media={mediaByExercise[infoExercise.id] ?? []}
          onClose={() => setInfoExercise(null)}
        />
      )}
    </div>
  );
}
