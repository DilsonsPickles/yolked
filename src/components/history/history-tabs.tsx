"use client";

import { useState } from "react";
import { WorkoutCalendar } from "./workout-calendar";
import { ProgressGraphs } from "./progress-graphs";

type Tab = "calendar" | "progress";

interface SessionsByDate {
  [date: string]: {
    id: string;
    workout_name: string;
    started_at: string;
    completed_at: string;
  }[];
}

interface SetData {
  exercise_id: string;
  exercise_name: string;
  weight_used: number | null;
  reps_completed: number | null;
  completed_at: string;
}

interface Props {
  sessionsByDate: SessionsByDate;
  progressSets: SetData[];
}

export function HistoryTabs({ sessionsByDate, progressSets }: Props) {
  const [tab, setTab] = useState<Tab>("calendar");

  return (
    <div>
      {/* Tab toggle */}
      <div className="mb-4 flex gap-1 rounded-lg bg-zinc-800 p-1">
        <button
          onClick={() => setTab("calendar")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "calendar"
              ? "bg-orange-500 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => setTab("progress")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "progress"
              ? "bg-orange-500 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Progress
        </button>
      </div>

      {tab === "calendar" ? (
        <WorkoutCalendar sessionsByDate={sessionsByDate} />
      ) : (
        <ProgressGraphs sets={progressSets} />
      )}
    </div>
  );
}
