import Link from "next/link";
import { STATUS_LABEL } from "@/lib/goals/transitions";

export interface GoalsCardItem {
  id: string;
  name: string;
  kind: "strength" | "mobility";
  activeRung: { name: string; status: string } | null;
}

const STATUS_STYLE: Record<string, string> = {
  form: "bg-violet-500/15 text-violet-300",
  building: "bg-blue-500/15 text-blue-300",
};

export function GoalsCard({ goals }: { goals: GoalsCardItem[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-200">Goals</h2>
        <Link href="/goals" className="text-sm text-orange-400 hover:text-orange-300">
          Build session →
        </Link>
      </div>
      <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
        {goals.map((g) => (
          <Link
            key={g.id}
            href={`/goals/${g.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/50"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                g.kind === "strength" ? "bg-orange-500" : "bg-teal-400"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{g.name}</p>
              <p className="truncate text-xs text-zinc-500">
                {g.activeRung ? g.activeRung.name : "No active rung"}
              </p>
            </div>
            {g.activeRung && (
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  STATUS_STYLE[g.activeRung.status] ?? "bg-zinc-800 text-zinc-400"
                }`}
              >
                {STATUS_LABEL[g.activeRung.status as keyof typeof STATUS_LABEL] ?? g.activeRung.status}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
