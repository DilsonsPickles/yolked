"use client";

import { useMemo } from "react";

interface Props {
  /** ISO timestamps of completed sessions this week */
  sessionDates: string[];
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeeklyActivity({ sessionDates }: Props) {
  const { days, totalCount } = useMemo(() => {
    const now = new Date();
    const todayIndex = now.getDay(); // 0=Sun

    // Build start of week (Sunday) in local time
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - todayIndex);
    weekStart.setHours(0, 0, 0, 0);

    // Count sessions per local day
    const countByDay = new Map<number, number>();
    for (const iso of sessionDates) {
      const d = new Date(iso);
      const dayOfWeek = d.getDay();
      countByDay.set(dayOfWeek, (countByDay.get(dayOfWeek) || 0) + 1);
    }

    const days = DAY_LABELS.map((label, i) => ({
      label,
      count: countByDay.get(i) || 0,
      isToday: i === todayIndex,
      isFuture: i > todayIndex,
    }));

    return { days, totalCount: sessionDates.length };
  }, [sessionDates]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-medium text-zinc-300">This Week</p>
        <p className="text-sm text-zinc-500">
          {totalCount} workout{totalCount !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex justify-between">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                day.count > 0
                  ? "bg-orange-500 text-white"
                  : day.isToday
                    ? "border-2 border-orange-500/50 text-zinc-400"
                    : day.isFuture
                      ? "border border-zinc-800 text-zinc-700"
                      : "border border-zinc-700 text-zinc-500"
              }`}
            >
              {day.count > 1 ? (
                <span className="text-xs font-bold">{day.count}</span>
              ) : day.count === 1 ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              ) : null}
            </div>
            <span
              className={`text-xs font-medium ${
                day.isToday
                  ? "text-orange-400"
                  : day.isFuture
                    ? "text-zinc-700"
                    : "text-zinc-500"
              }`}
            >
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
