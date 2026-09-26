import type { ExerciseKind } from "@/lib/types/database";

const STYLES: Record<ExerciseKind, string> = {
  strength: "bg-orange-500/10 text-orange-400",
  mobility: "bg-teal-500/10 text-teal-300",
  skill: "bg-violet-500/10 text-violet-300",
  project: "bg-amber-500/10 text-amber-300",
};

export const KIND_LABEL: Record<ExerciseKind, string> = {
  strength: "Strength",
  mobility: "Mobility",
  skill: "Skill",
  project: "Project",
};

/** Small coloured pill for an exercise kind. Strength is the default, so it's hidden unless forced. */
export function KindBadge({ kind, always = false }: { kind: ExerciseKind; always?: boolean }) {
  if (kind === "strength" && !always) return null;
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STYLES[kind]}`}>
      {KIND_LABEL[kind]}
    </span>
  );
}
