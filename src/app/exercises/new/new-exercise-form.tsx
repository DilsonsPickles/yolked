"use client";

import { useState } from "react";
import { createExercise } from "@/app/exercises/actions";
import type { ExerciseKind } from "@/lib/types/database";
import { KIND_LABEL } from "@/components/exercises/kind-badge";
import { EQUIPMENT, MUSCLE_GROUPS } from "@/components/exercises/exercise-filters";

const textClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

interface LinkRow {
  label: string;
  url: string;
}

export function NewExerciseForm() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ExerciseKind>("strength");
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([{ label: "Demo", url: "" }]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMuscle(m: string) {
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function updateLink(i: number, update: Partial<LinkRow>) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...update } : l)));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createExercise({
      name,
      kind,
      primary_muscles: muscles,
      equipment: equipment || null,
      links: links.filter((l) => l.url.trim()),
      notes: notes || null,
    });
    if (result?.error) {
      setError(result.error);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. False-grip ring row"
          className={textClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Kind</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABEL) as ExerciseKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                kind === k
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Muscles</label>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMuscle(m)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                muscles.includes(m)
                  ? "bg-orange-500/20 text-orange-300"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Equipment</label>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm text-zinc-200 focus:border-orange-500 focus:outline-none"
        >
          <option value="">None / not set</option>
          {EQUIPMENT.map((e) => (
            <option key={e} value={e}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">Reference links</label>
          <button
            type="button"
            onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
            className="text-xs text-orange-400 hover:text-orange-300"
          >
            + Add link
          </button>
        </div>
        <p className="mb-2 text-xs text-zinc-500">
          YouTube links keep their timecode (the t= part) so the video opens at the right spot.
        </p>
        <div className="space-y-2">
          {links.map((l, i) => (
            <div key={i} className="grid grid-cols-[6rem_1fr] gap-2">
              <input
                type="text"
                value={l.label}
                onChange={(e) => updateLink(i, { label: e.target.value })}
                placeholder="Label"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
              />
              <input
                type="url"
                value={l.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder="https://youtu.be/..."
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Notes / cues</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Setup, cues, progressions..."
          className={textClass}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Create Exercise"}
      </button>
    </div>
  );
}
