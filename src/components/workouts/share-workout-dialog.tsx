"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { shareWorkout, unshareWorkout } from "@/app/workouts/actions";

interface Props {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  workoutName: string;
}

interface BroShare {
  bro_id: string;
  display_name: string | null;
  shared: boolean;
}

export function ShareWorkoutDialog({
  open,
  onClose,
  workoutId,
  workoutName,
}: Props) {
  const [bros, setBros] = useState<BroShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      // Fetch bros
      const { data: brosData } = await supabase
        .from("bros")
        .select("bro_id, profile:profiles!bro_id(display_name)")
        .order("created_at", { ascending: false });

      // Fetch existing shares for this workout
      const { data: sharesData } = await supabase
        .from("workout_shares")
        .select("shared_with_user_id")
        .eq("workout_id", workoutId);

      const sharedIds = new Set(
        (sharesData || []).map((s) => s.shared_with_user_id)
      );

      setBros(
        ((brosData as unknown as {
          bro_id: string;
          profile: { display_name: string | null };
        }[]) || []).map((b) => ({
          bro_id: b.bro_id,
          display_name: b.profile.display_name,
          shared: sharedIds.has(b.bro_id),
        }))
      );
      setLoading(false);
    };

    fetchData();
  }, [open, workoutId]);

  const toggleShare = async (broId: string, currentlyShared: boolean) => {
    setSaving(broId);

    if (currentlyShared) {
      await unshareWorkout(workoutId, broId);
    } else {
      await shareWorkout(workoutId, broId);
    }

    setBros((prev) =>
      prev.map((b) =>
        b.bro_id === broId ? { ...b, shared: !currentlyShared } : b
      )
    );
    setSaving(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-900 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-semibold">Share Workout</h2>
            <p className="text-sm text-zinc-500">{workoutName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-white"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-zinc-800"
                />
              ))}
            </div>
          ) : bros.length > 0 ? (
            <div className="space-y-2">
              {bros.map((bro) => (
                <button
                  key={bro.bro_id}
                  onClick={() => toggleShare(bro.bro_id, bro.shared)}
                  disabled={saving === bro.bro_id}
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-sm font-bold text-orange-500">
                      {(bro.display_name || "?")[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-white">
                      {bro.display_name || "Unknown"}
                    </span>
                  </div>
                  <div
                    className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                      bro.shared ? "bg-green-500" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        bro.shared ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 p-8 text-center">
              <p className="text-sm text-zinc-500">
                No bros yet. Add some on the Bros page first!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
