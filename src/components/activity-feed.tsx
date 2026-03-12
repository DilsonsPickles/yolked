"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleReaction } from "@/app/feed/actions";

export interface FeedItem {
  sessionId: string;
  workoutName: string;
  startedAt: string;
  completedAt: string;
  durationMin: number;
  userId: string;
  displayName: string | null;
  isOwn: boolean;
  reactions: {
    id: string;
    userId: string;
    displayName: string | null;
    reaction: string;
  }[];
  currentUserReaction: string | null;
}

const REACTIONS = ["💪", "🔥", "🏆", "😤"] as const;

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function FeedCard({ item }: { item: FeedItem }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticReaction, setOptimisticReaction] = useState<string | null>(
    item.currentUserReaction
  );
  const [showPicker, setShowPicker] = useState(false);

  function handleReaction(reaction: string) {
    const newReaction = optimisticReaction === reaction ? null : reaction;
    setOptimisticReaction(newReaction);
    setShowPicker(false);
    startTransition(async () => {
      await toggleReaction(item.sessionId, reaction);
    });
  }

  // Group reactions by emoji for display
  const reactionCounts = new Map<string, { count: number; names: string[] }>();
  for (const r of item.reactions) {
    // If this is the current user's reaction, use optimistic state
    if (r.userId === "CURRENT_USER") continue;
    const existing = reactionCounts.get(r.reaction);
    if (existing) {
      existing.count++;
      existing.names.push(r.displayName || "Someone");
    } else {
      reactionCounts.set(r.reaction, {
        count: 1,
        names: [r.displayName || "Someone"],
      });
    }
  }
  // Add current user's optimistic reaction to counts
  if (optimisticReaction) {
    const existing = reactionCounts.get(optimisticReaction);
    if (existing) {
      existing.count++;
      existing.names.push("You");
    } else {
      reactionCounts.set(optimisticReaction, { count: 1, names: ["You"] });
    }
  }

  const card = (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700">
      {/* Header: name + time */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              item.isOwn
                ? "bg-orange-500/20 text-orange-400"
                : "bg-zinc-700 text-zinc-300"
            }`}
          >
            {(item.displayName || "?")[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium text-zinc-300">
            {item.isOwn ? "You" : item.displayName || "Bro"}
          </span>
        </div>
        <span className="text-xs text-zinc-500">
          {timeAgo(item.completedAt)}
        </span>
      </div>

      {/* Workout info */}
      <p className="font-semibold text-white">{item.workoutName}</p>
      <p className="mt-1 text-sm text-zinc-500">{item.durationMin}min</p>

      {/* Reaction summary (existing reactions from others) */}
      {reactionCounts.size > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from(reactionCounts.entries()).map(
            ([emoji, { count, names }]) => {
              const isOwnReaction = !item.isOwn && emoji === optimisticReaction;
              return (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isOwnReaction) setShowPicker(true);
                  }}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    isOwnReaction
                      ? "bg-orange-500/20 ring-1 ring-orange-500/50 cursor-pointer"
                      : "bg-zinc-800 cursor-default"
                  }`}
                  title={names.join(", ")}
                >
                  {emoji}
                  {count > 1 && (
                    <span className="text-zinc-400">{count}</span>
                  )}
                </button>
              );
            }
          )}
        </div>
      )}

      {/* Reaction buttons — show picker if no reaction yet, or if user tapped their reaction to change it */}
      {!item.isOwn && (!optimisticReaction || showPicker) && (
        <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3">
          {REACTIONS.map((r) => (
            <button
              key={r}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleReaction(r);
              }}
              disabled={isPending}
              className={`rounded-lg px-3 py-1.5 text-base transition-all ${
                optimisticReaction === r
                  ? "bg-orange-500/20 ring-1 ring-orange-500/50 scale-110"
                  : "bg-zinc-800 hover:bg-zinc-700"
              } ${isPending ? "opacity-50" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (item.isOwn) {
    return (
      <Link href={`/history/${item.sessionId}`} className="block">
        {card}
      </Link>
    );
  }

  return card;
}

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
        No activity yet. Complete a workout or add some bros!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <FeedCard key={item.sessionId} item={item} />
      ))}
    </div>
  );
}
