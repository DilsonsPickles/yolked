"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SetData {
  exercise_id: string;
  exercise_name: string;
  weight_used: number | null;
  reps_completed: number | null;
  completed_at: string; // session completed_at
}

interface Props {
  sets: SetData[];
}

type TimeRange = "1w" | "1m" | "3m" | "12m" | "all";

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "12m", label: "12M" },
  { key: "all", label: "All" },
];

function getCutoffDate(range: TimeRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "1w") now.setDate(now.getDate() - 7);
  else if (range === "1m") now.setMonth(now.getMonth() - 1);
  else if (range === "3m") now.setMonth(now.getMonth() - 3);
  else if (range === "12m") now.setFullYear(now.getFullYear() - 1);
  return now;
}

export function ProgressGraphs({ sets }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("3m");

  // Build sorted list of unique exercises that have data
  const exercises = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sets) {
      if (!map.has(s.exercise_id)) {
        map.set(s.exercise_id, s.exercise_name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sets]);

  const [selectedExercise, setSelectedExercise] = useState<string>(
    exercises[0]?.id ?? ""
  );

  // Compute chart data for the selected exercise + metric + time range
  const chartData = useMemo(() => {
    const cutoff = getCutoffDate(timeRange);
    const filtered = sets.filter(
      (s) =>
        s.exercise_id === selectedExercise &&
        s.weight_used != null &&
        s.reps_completed != null &&
        (!cutoff || new Date(s.completed_at) >= cutoff)
    );

    // Group by session date, take max weight per date
    const byDate = new Map<string, number>();

    for (const s of filtered) {
      const date = new Date(s.completed_at).toLocaleDateString("en-CA"); // YYYY-MM-DD
      const current = byDate.get(date) ?? 0;
      byDate.set(date, Math.max(current, s.weight_used!));
    }

    const points = Array.from(byDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return points;
  }, [sets, selectedExercise, timeRange]);

  if (exercises.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-600">
        No completed sets yet. Finish a workout to see your progress.
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const metricUnit = "kg";

  return (
    <div className="space-y-4">
      {/* Exercise selector */}
      <select
        value={selectedExercise}
        onChange={(e) => setSelectedExercise(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      >
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </select>

      {/* Time range toggle */}
      <div className="flex gap-1 rounded-lg bg-zinc-800 p-1">
        {TIME_RANGES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTimeRange(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              timeRange === t.key
                ? "bg-orange-500 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                }}
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(value) => [
                  `${Number(value).toLocaleString()} ${metricUnit}`,
                  "Max Weight",
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: "#f97316", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-zinc-600">
          No data for this exercise yet
        </div>
      )}
    </div>
  );
}
