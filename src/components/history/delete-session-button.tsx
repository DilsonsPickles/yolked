"use client";

import { deleteSession } from "@/app/history/actions";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  return (
    <button
      onClick={async () => {
        if (confirm("Delete this session from your history?")) {
          await deleteSession(sessionId);
        }
      }}
      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
    >
      Delete
    </button>
  );
}
