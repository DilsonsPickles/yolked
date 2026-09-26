"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  seconds: number;
  /** Called with the seconds actually held when the timer ends or is stopped. */
  onDone: (elapsed: number) => void;
  compact?: boolean;
}

/**
 * Countdown for a timed hold. Uses an end timestamp so it keeps time when the
 * PWA is backgrounded, and vibrates (where supported) when it reaches zero.
 */
export function HoldTimer({ seconds, onDone, compact = false }: Props) {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(seconds);
  const startedAt = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!endTime) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setEndTime(null);
        navigator.vibrate?.([200, 100, 200]);
        onDoneRef.current(seconds);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endTime, seconds]);

  const running = endTime !== null;

  function start() {
    startedAt.current = Date.now();
    setRemaining(seconds);
    setEndTime(Date.now() + seconds * 1000);
  }

  function stop() {
    const elapsed = startedAt.current
      ? Math.min(seconds, Math.round((Date.now() - startedAt.current) / 1000))
      : 0;
    setEndTime(null);
    setRemaining(seconds);
    onDoneRef.current(elapsed);
  }

  const label = `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, "0")}`;

  if (running) {
    return (
      <button
        type="button"
        onClick={stop}
        className={`flex items-center justify-center gap-2 rounded-lg bg-blue-500/20 font-mono font-bold text-blue-300 ${
          compact ? "h-8 px-2 text-sm" : "h-10 px-3 text-base"
        }`}
        aria-label="Stop hold"
      >
        {label}
        <span className="text-[10px] font-sans font-medium uppercase text-blue-400">stop</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      className={`flex items-center justify-center gap-1 rounded-lg border border-blue-500/40 text-blue-400 transition-colors hover:bg-blue-500/10 ${
        compact ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm"
      }`}
      aria-label={`Start ${seconds} second hold`}
    >
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
      {seconds}s
    </button>
  );
}
