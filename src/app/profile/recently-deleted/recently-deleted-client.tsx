"use client";

import { useState } from "react";
import Link from "next/link";
import {
  restoreWorkout,
  permanentlyDeleteWorkout,
  restoreSession,
  permanentlyDeleteSession,
  deleteAllPermanently,
} from "./actions";

interface DeletedWorkout {
  id: string;
  name: string;
  description: string | null;
  deleted_at: string;
  workout_exercises: { count: number }[];
}

interface DeletedSession {
  id: string;
  started_at: string;
  completed_at: string | null;
  deleted_at: string;
  workout: { name: string }[] | { name: string } | null;
}

interface DeletedItem {
  id: string;
  type: "workout" | "session";
  name: string;
  subtitle: string;
  deleted_at: string;
}

interface Props {
  workouts: DeletedWorkout[];
  sessions: DeletedSession[];
}

function buildItems(
  workouts: DeletedWorkout[],
  sessions: DeletedSession[]
): DeletedItem[] {
  const items: DeletedItem[] = [];

  for (const w of workouts) {
    const exerciseCount = w.workout_exercises?.[0]?.count ?? 0;
    items.push({
      id: w.id,
      type: "workout",
      name: w.name,
      subtitle: `Template · ${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""}`,
      deleted_at: w.deleted_at,
    });
  }

  for (const s of sessions) {
    const workoutName =
      (s.workout as unknown as { name: string })?.name || "Workout";
    const date = new Date(s.started_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    items.push({
      id: s.id,
      type: "session",
      name: workoutName,
      subtitle: `Session · ${date}`,
      deleted_at: s.deleted_at,
    });
  }

  // Sort by deletion date, most recent first
  items.sort(
    (a, b) =>
      new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
  );

  return items;
}

export function RecentlyDeletedClient({ workouts, sessions }: Props) {
  const [items, setItems] = useState(() => buildItems(workouts, sessions));
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const daysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt).getTime();
    const expiry = deleted + 30 * 24 * 60 * 60 * 1000;
    const remaining = Math.ceil(
      (expiry - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, remaining);
  };

  const handleRestore = async (item: DeletedItem) => {
    setLoadingId(item.id);
    const result =
      item.type === "workout"
        ? await restoreWorkout(item.id)
        : await restoreSession(item.id);
    if (!result.error) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    setLoadingId(null);
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    setLoadingId(item.id);
    const result =
      item.type === "workout"
        ? await permanentlyDeleteWorkout(item.id)
        : await permanentlyDeleteSession(item.id);
    if (!result.error) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    setLoadingId(null);
    setConfirmDeleteId(null);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    const result = await deleteAllPermanently();
    if (!result.error) {
      setItems([]);
    }
    setDeletingAll(false);
    setConfirmDeleteAll(false);
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-6">
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-white"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Recently Deleted
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Items are automatically deleted after 30 days
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        {items.length > 0 && (
          <div className="flex justify-end">
            {confirmDeleteAll ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Are you sure?</span>
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                >
                  {deletingAll ? "Deleting..." : "Delete All"}
                </button>
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                Delete All
              </button>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <svg
                className="h-8 w-8 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-400">
              No recently deleted items
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Deleted workouts and sessions will appear here for 30 days
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const days = daysRemaining(item.deleted_at);

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{item.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.type === "workout"
                            ? "bg-orange-500/15 text-orange-400"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {item.type === "workout" ? "Template" : "Session"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        {item.subtitle}
                      </span>
                      <span className="text-xs text-zinc-700">&middot;</span>
                      <span
                        className={`text-xs ${days <= 7 ? "text-red-400" : "text-zinc-500"}`}
                      >
                        {days} day{days !== 1 ? "s" : ""} remaining
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={loadingId === item.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500/20 px-3 py-2 text-sm font-semibold text-orange-400 transition-colors hover:bg-orange-500/30 disabled:opacity-50"
                    >
                      {loadingId === item.id ? (
                        <Spinner />
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                          />
                        </svg>
                      )}
                      Restore
                    </button>

                    {confirmDeleteId === item.id ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handlePermanentDelete(item)}
                          disabled={loadingId === item.id}
                          className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {loadingId === item.id ? <Spinner /> : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        disabled={loadingId === item.id}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
