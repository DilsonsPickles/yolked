"use client";

import { useState } from "react";
import { addBro, removeBro } from "./actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface BroProfile {
  bro_id: string;
  profile: { display_name: string | null };
}

interface Props {
  shareCode: string;
  bros: BroProfile[];
}

export function BrosClient({ shareCode, bros: initialBros }: Props) {
  const [bros, setBros] = useState(initialBros);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [removingBroId, setRemovingBroId] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdd = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);

    const result = await addBro(code);

    if (result.error) {
      setMessage({ text: result.error, type: "error" });
    } else {
      setMessage({
        text: `${result.broName || "Bro"} added!`,
        type: "success",
      });
      setCode("");
      // Refresh the page to get updated bros list
      window.location.reload();
    }
    setLoading(false);
  };

  const handleRemove = async (broId: string) => {
    const result = await removeBro(broId);
    if (!result.error) {
      setBros((prev) => prev.filter((b) => b.bro_id !== broId));
    }
    setRemovingBroId(null);
  };

  return (
    <div className="space-y-6">
      {/* Your Bro Code */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-400">Your Bro Code</h2>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono text-2xl font-bold tracking-widest text-orange-500">
            {shareCode}
          </span>
          <button
            onClick={handleCopy}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Share this code with your gym buddy
        </p>
      </div>

      {/* Add a Bro */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-400">Add a Bro</h2>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter bro code"
            maxLength={6}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 font-mono text-sm uppercase tracking-widest text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <button
            onClick={handleAdd}
            disabled={loading || code.length !== 6}
            className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "..." : "Add"}
          </button>
        </div>
        {message && (
          <p
            className={`mt-2 text-sm ${
              message.type === "error" ? "text-red-400" : "text-green-400"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* Bros List */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Your Bros</h2>
        {bros.length > 0 ? (
          <div className="space-y-2">
            {bros.map((bro) => (
              <div
                key={bro.bro_id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-sm font-bold text-orange-500">
                    {(bro.profile.display_name || "?")[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-white">
                    {bro.profile.display_name || "Unknown"}
                  </span>
                </div>
                <button
                  onClick={() => setRemovingBroId(bro.bro_id)}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-sm text-zinc-500">
              No bros yet. Share your code or enter theirs!
            </p>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={removingBroId !== null}
        title="Remove Bro"
        message="Are you sure you want to remove this bro?"
        confirmLabel="Remove"
        onConfirm={() => removingBroId && handleRemove(removingBroId)}
        onCancel={() => setRemovingBroId(null)}
      />
    </div>
  );
}
