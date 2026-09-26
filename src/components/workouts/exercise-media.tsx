"use client";

import { useState } from "react";
import type { ExerciseLink } from "@/lib/types/database";
import type { SignedMedia } from "@/lib/media/signed-urls";

interface Props {
  media: SignedMedia[];
  links: ExerciseLink[];
  /** Start expanded (exercise detail page) rather than collapsed (performer). */
  open?: boolean;
}

function formatStart(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return ` at ${m}:${s.toString().padStart(2, "0")}`;
}

/** Muted looping clip(s) plus the reference links for an exercise. */
export function ExerciseMediaStrip({ media, links, open = false }: Props) {
  const [expanded, setExpanded] = useState(open);
  const [active, setActive] = useState(0);

  if (media.length === 0 && links.length === 0) return null;

  const current = media[Math.min(active, media.length - 1)];

  return (
    <div className="space-y-2">
      {media.length > 0 && (
        <div>
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Show clip{media.length > 1 ? `s (${media.length})` : ""}
            </button>
          ) : (
            <div className="space-y-2">
              <video
                key={current.url}
                src={current.url}
                muted
                loop
                playsInline
                autoPlay
                controls={current.kind === "own"}
                className="w-full rounded-lg bg-black"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {media.length > 1 &&
                  media.map((m, i) => (
                    <button
                      key={m.path}
                      type="button"
                      onClick={() => setActive(i)}
                      className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                        i === active
                          ? "bg-orange-500/20 text-orange-300"
                          : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {m.kind === "own" ? `Me: ${m.label}` : m.label}
                    </button>
                  ))}
                {!open && (
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Hide
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {links.map((l, i) => (
            <a
              key={`${l.url}-${i}`}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-zinc-400 underline-offset-2 hover:text-orange-300 hover:underline"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              {i === 0 && l.label === "Demo" ? "Full video" : l.label}
              {formatStart(l.start_seconds)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
