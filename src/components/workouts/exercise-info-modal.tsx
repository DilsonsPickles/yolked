"use client";

import { useEffect, useState, useCallback } from "react";
import type { Exercise } from "@/lib/types/database";

interface Props {
  exercise: Exercise;
  onClose: () => void;
}

export function ExerciseInfoModal({ exercise, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  // Trigger enter animation on mount
  useEffect(() => {
    // Small delay so the initial render is at translate-y-full, then we animate in
    const raf = requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    // Wait for the slide-out animation to finish before unmounting
    setTimeout(onClose, 300);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-zinc-700 bg-zinc-900 transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle */}
        <div className="sticky top-0 z-10 flex justify-center bg-zinc-900 pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-zinc-600" />
        </div>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {exercise.name}
              </h2>
              <div className="mt-1 flex flex-wrap gap-2">
                {exercise.primary_muscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400"
                  >
                    {m}
                  </span>
                ))}
                {exercise.secondary_muscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Details row */}
          <div className="mt-4 flex flex-wrap gap-2">
            {exercise.equipment && (
              <span className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 capitalize">
                {exercise.equipment}
              </span>
            )}
            <span className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 capitalize">
              {exercise.category}
            </span>
            <span className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 capitalize">
              {exercise.level}
            </span>
            {exercise.force && (
              <span className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 capitalize">
                {exercise.force}
              </span>
            )}
            {exercise.mechanic && (
              <span className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 capitalize">
                {exercise.mechanic}
              </span>
            )}
          </div>

          {/* Images */}
          {exercise.images.length > 0 && (
            <div className="mt-4 flex gap-3 overflow-x-auto">
              {exercise.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${exercise.name} step ${i + 1}`}
                  className="h-40 w-40 shrink-0 rounded-xl bg-zinc-800 object-cover"
                />
              ))}
            </div>
          )}

          {/* Instructions */}
          {exercise.instructions.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-semibold text-zinc-400">
                Instructions
              </h3>
              <ol className="space-y-3">
                {exercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-zinc-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-orange-500">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
