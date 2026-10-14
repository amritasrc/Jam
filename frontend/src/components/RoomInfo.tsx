import { useState } from "react";

type RoomInfoProps = {
  roomId: string;
  members?: number;
};

export default function RoomInfo({ roomId, members }: RoomInfoProps) {
  const [copied, setCopied] = useState(false);

  if (!roomId) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="glass rounded-3xl p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400">
            Room code
          </p>
          <div className="mt-1 flex items-center gap-3">
            <span className="gradient-text font-mono text-3xl font-bold tracking-wider">
              {roomId}
            </span>
            <button
              type="button"
              onClick={copy}
              className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Share this code to listen together.
          </p>
        </div>

        {typeof members === "number" && (
          <div className="flex items-center gap-2 rounded-2xl bg-white/60 px-4 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-slate-700">
              {members} listening
            </span>
          </div>
        )}
      </div>
    </section>
  );
}