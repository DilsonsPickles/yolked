"use client";

import { useState } from "react";
import Link from "next/link";

interface SessionDay {
  date: string; // YYYY-MM-DD
  sessions: {
    id: string;
    workout_name: string;
    started_at: string;
    completed_at: string;
  }[];
}

interface Props {
  sessionsByDate: Record<string, SessionDay["sessions"]>;
}

export function WorkoutCalendar({ sessionsByDate }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const prevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    setCurrentDate(prev);
    const isPrevCurrent =
      prev.getMonth() === today.getMonth() &&
      prev.getFullYear() === today.getFullYear();
    setSelectedDay(isPrevCurrent ? today.getDate() : null);
  };
  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    setCurrentDate(next);
    const isNextCurrent =
      next.getMonth() === today.getMonth() &&
      next.getFullYear() === today.getFullYear();
    setSelectedDay(isNextCurrent ? today.getDate() : null);
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const getDateKey = (day: number) => {
    const m = (month + 1).toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const isCurrentMonth =
    month === today.getMonth() && year === today.getFullYear();
  const [selectedDay, setSelectedDay] = useState<number | null>(
    isCurrentMonth ? today.getDate() : null
  );
  const selectedSessions = selectedDay
    ? sessionsByDate[getDateKey(selectedDay)] || []
    : [];

  return (
    <div>
      {/* Month nav */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-lg p-2 text-zinc-400 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold">{monthName}</h2>
        <button
          onClick={nextMonth}
          className="rounded-lg p-2 text-zinc-400 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 text-center text-xs text-zinc-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} />;
          }

          const dateKey = getDateKey(day);
          const sessions = sessionsByDate[dateKey];
          const hasWorkout = sessions && sessions.length > 0;
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative flex flex-col items-center rounded-lg py-2 text-sm transition-colors ${
                isSelected
                  ? "bg-orange-500 text-white"
                  : isToday(day)
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50"
              }`}
            >
              {day}
              {hasWorkout && (
                <div
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                    isSelected ? "bg-white" : "bg-orange-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day sessions */}
      {selectedDay && (
        <div className="mt-4 space-y-2">
          {selectedSessions.length > 0 ? (
            selectedSessions.map((session) => {
              const started = new Date(session.started_at);
              const completed = new Date(session.completed_at);
              const durationMin = Math.round(
                (completed.getTime() - started.getTime()) / 60000
              );

              return (
                <Link
                  key={session.id}
                  href={`/history/${session.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white">
                      {session.workout_name}
                    </h3>
                    <span className="text-sm text-zinc-500">
                      {durationMin}min
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {started.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Link>
              );
            })
          ) : (
            <p className="py-4 text-center text-sm text-zinc-600">
              No workouts on this day
            </p>
          )}
        </div>
      )}
    </div>
  );
}
