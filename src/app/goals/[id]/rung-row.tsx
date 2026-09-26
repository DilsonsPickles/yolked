"use client";

import { useState } from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Exercise, GoalRung } from "@/lib/types/database";
import { formatPrescription } from "@/lib/prescription";
import { ACTION_LABEL, STATUS_LABEL, actionFor, type RungAction } from "@/lib/goals/transitions";
import { STATUS_STYLE } from "@/app/goals/goals-client";

interface Props {
  rung: GoalRung & { exercise: Exercise | null };
  index: number;
  busy: boolean;
  onAction: (action: RungAction) => void;
  onGraduateWhen: (text: string) => void;
  onRemove: () => void;
}

export function RungRow({ rung, index, busy, onAction, onGraduateWhen, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rung.id,
  });
  const [text, setText] = useState(rung.graduate_when);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const action = actionFor(rung.status);
  const locked = rung.status === "locked";
  const summary = formatPrescription({ ...rung, target_sets: rung.target_sets ?? 1 });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-zinc-900 p-4 ${
        rung.status === "form" || rung.status === "building"
          ? "border-orange-500/30"
          : "border-zinc-800"
      } ${locked ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-zinc-600 hover:text-zinc-400"
          aria-label="Drag to reorder"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-orange-500">
              {index + 1}
            </span>
            <Link
              href={`/exercises/${rung.exercise_id}`}
              className="truncate font-medium text-white hover:text-orange-300"
            >
              {rung.exercise?.name ?? rung.exercise_id}
            </Link>
          </div>
          {summary && <p className="mt-1 text-xs text-zinc-400">{summary}</p>}
          {rung.prescription_text && rung.prescription_text !== summary && (
            <p className="text-xs text-zinc-500">{rung.prescription_text}</p>
          )}
        </div>

        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[rung.status]}`}
        >
          {STATUS_LABEL[rung.status]}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-600">
            Graduate when
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              if (text !== rung.graduate_when) onGraduateWhen(text);
            }}
            placeholder="e.g. 3×8 clean reps"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => onAction(action)}
          disabled={busy}
          className={`mt-4 shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
            action === "graduate"
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          {ACTION_LABEL[action]}
        </button>
        <button
          onClick={onRemove}
          disabled={busy}
          className="mt-4 rounded-lg p-1.5 text-zinc-600 hover:text-red-400 disabled:opacity-50"
          aria-label={`Remove ${rung.exercise?.name ?? rung.exercise_id} from ladder`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
