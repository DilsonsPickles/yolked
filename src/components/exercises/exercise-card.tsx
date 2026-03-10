import Link from "next/link";
import type { Exercise } from "@/lib/types/database";

interface Props {
  exercise: Exercise;
  action?: React.ReactNode;
}

export function ExerciseCard({ exercise, action }: Props) {
  const content = (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold uppercase text-orange-500">
        {exercise.primary_muscles[0]?.slice(0, 3) || "???"}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-white">{exercise.name}</h3>
        <div className="mt-1 flex flex-wrap gap-1">
          {exercise.primary_muscles.map((m) => (
            <span
              key={m}
              className="rounded bg-orange-500/10 px-2 py-0.5 text-xs text-orange-400"
            >
              {m}
            </span>
          ))}
          {exercise.equipment && (
            <span className="rounded bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400">
              {exercise.equipment}
            </span>
          )}
        </div>
      </div>
      {action}
    </div>
  );

  if (action) {
    return content;
  }

  return (
    <Link href={`/exercises/${exercise.id}`}>
      {content}
    </Link>
  );
}
