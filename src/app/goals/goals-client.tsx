"use client";

import { useState } from "react";
import Link from "next/link";
import { buildSessionFromGoals, createGoal } from "./actions";
import type { GoalKind, RungStatus } from "@/lib/types/database";
import { STATUS_LABEL } from "@/lib/goals/transitions";

export interface GoalCard {
  id: string;
  name: string;
  kind: GoalKind;
  pass_condition: string;
  achieved: boolean;
  rungCount: number;
  completedRungs: number;
  activeRung: { name: string; status: RungStatus } | null;
  benchmark: { name: string; target_seconds: number | null; best_seconds: number | null } | null;
}

export interface BaseOption {
  id: string;
  name: string;
}

interface Props {
  goals: GoalCard[];
  bases: BaseOption[];
}

const KIND_STYLE: Record<GoalKind, string> = {
  strength: "bg-orange-500/10 text-orange-400",
  mobility: "bg-teal-500/10 text-teal-300",
};

export const STATUS_STYLE: Record<RungStatus, string> = {
  locked: "bg-zinc-800 text-zinc-500",
  form: "bg-violet-500/15 text-violet-300",
  building: "bg-blue-500/15 text-blue-300",
  maintaining: "bg-green-500/15 text-green-400",
};

function fmtSeconds(s: number) {
  return s >= 60 ? `${Math.round((s / 60) * 10) / 10} min` : `${s}s`;
}

function GoalCardView({ goal }: { goal: GoalCard }) {
  const pct = goal.benchmark?.target_seconds
    ? Math.min(100, Math.round(((goal.benchmark.best_seconds ?? 0) / goal.benchmark.target_seconds) * 100))
    : goal.rungCount > 0
      ? Math.round((goal.completedRungs / goal.rungCount) * 100)
      : 0;

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-white">{goal.name}</h3>
            {goal.achieved && (
              <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-400">
                Achieved
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{goal.pass_condition}</p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize ${KIND_STYLE[goal.kind]}`}>
          {goal.kind}
        </span>
      </div>

      <div className="mt-3">
        {goal.benchmark ? (
          <p className="text-sm text-zinc-300">
            Best{" "}
            <span className="font-mono font-semibold text-white">
              {goal.benchmark.best_seconds != null ? fmtSeconds(goal.benchmark.best_seconds) : "—"}
            </span>
            {goal.benchmark.target_seconds && (
              <span className="text-zinc-500"> / {fmtSeconds(goal.benchmark.target_seconds)}</span>
            )}
          </p>
        ) : goal.activeRung ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate text-zinc-300">{goal.activeRung.name}</span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[goal.activeRung.status]}`}>
              {STATUS_LABEL[goal.activeRung.status]}
            </span>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            {goal.rungCount === 0 ? "No rungs yet" : "All rungs maintaining"}
          </p>
        )}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
        </div>
        {goal.rungCount > 0 && (
          <p className="mt-1 text-[11px] text-zinc-600">
            {goal.completedRungs}/{goal.rungCount} rungs
          </p>
        )}
      </div>
    </Link>
  );
}

export function GoalsClient({ goals, bases }: Props) {
  const ladders = goals.filter((g) => !g.benchmark);
  const benchmarks = goals.filter((g) => g.benchmark);

  const [baseId, setBaseId] = useState<string>("");
  const [building, setBuilding] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GoalKind>("strength");
  const [pass, setPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuild() {
    setBuilding(true);
    setError(null);
    const result = await buildSessionFromGoals(baseId || null);
    if (result?.error) {
      setError(result.error);
      setBuilding(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    const result = await createGoal({ name, kind, pass_condition: pass, description: null });
    if (result?.error) {
      setError(result.error);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Build today's session */}
      <div className="rounded-xl border border-orange-500/30 bg-zinc-900 p-4">
        <h2 className="text-sm font-semibold text-white">Build today&apos;s session</h2>
        <p className="mt-1 text-xs text-zinc-500">
          One block per active rung across your ladders, plus a light maintenance block. Pick a
          MoveMore routine to borrow its prep and finishing work.
        </p>
        <div className="mt-3 flex gap-2">
          <select
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="">No prep / finishing</option>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleBuild}
            disabled={building || ladders.length === 0}
            className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {building ? "Building..." : "Build"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Ladders */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Ladders ({ladders.length})</h2>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New goal
          </button>
        </div>

        {showNew && (
          <div className="mb-3 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goal name, e.g. Front lever"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
            />
            <div className="flex gap-2">
              {(["strength", "mobility"] as GoalKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors ${
                    kind === k
                      ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="What counts as done? e.g. 10 s straddle front lever"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
            />
            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create goal"}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {ladders.map((g) => (
            <GoalCardView key={g.id} goal={g} />
          ))}
          {ladders.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
              No ladder goals yet.
            </div>
          )}
        </div>
      </section>

      {/* Benchmarks */}
      {benchmarks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Zero Point benchmarks ({benchmarks.length})
          </h2>
          <div className="space-y-3">
            {benchmarks.map((g) => (
              <GoalCardView key={g.id} goal={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
