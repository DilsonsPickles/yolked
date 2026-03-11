"use client";

import { useState } from "react";
import { logout } from "@/app/login/actions";
import { updateDisplayName } from "./actions";

interface Props {
  displayName: string | null;
  email: string;
  shareCode: string;
}

export function ProfileClient({ displayName, email, shareCode }: Props) {
  const [name, setName] = useState(displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restDuration, setRestDuration] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("defaultRestDuration") ?? "180", 10);
    }
    return 180;
  });

  const handleSaveName = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set("displayName", name);
    const result = await updateDisplayName(formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCopyShareCode = async () => {
    await navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestDurationChange = (secs: number) => {
    setRestDuration(secs);
    localStorage.setItem("defaultRestDuration", secs.toString());
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const initial = (displayName ?? email ?? "?")[0].toUpperCase();

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-zinc-800 px-4 py-6">
        <h1 className="text-2xl font-black tracking-tight">Profile</h1>
      </header>

      <main className="mx-auto max-w-lg space-y-6 p-4">
        {/* Profile header */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">
              {displayName || "No name set"}
            </p>
            <p className="truncate text-sm text-zinc-500">{email}</p>
          </div>
        </div>

        {/* Edit display name */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <button
              onClick={handleSaveName}
              disabled={saving || name.trim() === (displayName ?? "")}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Share code */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Share Code
          </label>
          <p className="mb-2 text-xs text-zinc-500">
            Give this code to your bros so they can add you.
          </p>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 font-mono text-lg tracking-widest text-orange-400">
              {shareCode}
            </span>
            <button
              onClick={handleCopyShareCode}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Default rest timer */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Default Rest Timer
          </label>
          <p className="mb-3 text-xs text-zinc-500">
            Set your preferred rest duration between sets.
          </p>
          <div className="flex flex-wrap gap-2">
            {[60, 90, 120, 180, 300].map((secs) => (
              <button
                key={secs}
                onClick={() => handleRestDurationChange(secs)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  restDuration === secs
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                }`}
              >
                {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {loggingOut && (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
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
          )}
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </main>
    </div>
  );
}
