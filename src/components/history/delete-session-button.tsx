"use client";

import { useState } from "react";
import { deleteSession } from "@/app/history/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
      >
        Delete
      </button>
      <ConfirmDialog
        open={showConfirm}
        title="Delete Session"
        message="Delete this session from your history? You can restore it from Recently Deleted within 30 days."
        confirmLabel="Delete"
        onConfirm={async () => {
          setShowConfirm(false);
          await deleteSession(sessionId);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
