import { formatDuration, formatTime } from "../lib/format";

type NowPlayingProps = {
  title: string | null;
  thumbnail: string | null;
  duration: number | null;
  isPlaying: boolean;
  currentTime: number;
  isHost: boolean;
  onToggle: () => void;
};

type PlaybackStatus = "idle" | "playing" | "paused" | "finished";

const STATUS_META: Record<
  PlaybackStatus,
  { label: string; badge: string; hint: string; action: string }
> = {
  idle: {
    label: "Idle",
    badge: "bg-white/70 text-slate-500",
    hint: "Pick a track from the library to start the session.",
    action: "Nothing to play yet",
  },
  playing: {
    label: "Playing",
    badge: "bg-emerald-100/80 text-emerald-700",
    hint: "Synced across the room",
    action: "Pause for all",
  },
  paused: {
    label: "Paused",
    badge: "bg-amber-100/80 text-amber-700",
    hint: "Paused for everyone",
    action: "Resume for all",
  },
  finished: {
    label: "Finished",
    badge: "bg-indigo-100/80 text-indigo-700",
    hint: "That was the last track",
    action: "Replay for all",
  },
};

export default function NowPlaying({
  title,
  thumbnail,
  duration,
  isPlaying,
  currentTime,
  isHost,
  onToggle,
}: NowPlayingProps) {
  const hasTrack = Boolean(title);
  const totalTime = duration != null && duration > 0 ? duration : null;
  const elapsed = Math.max(0, totalTime ? Math.min(currentTime, totalTime) : currentTime);

  const isFinished =
    hasTrack && !isPlaying && totalTime !== null && elapsed >= totalTime - 0.2;

  const status: PlaybackStatus = !hasTrack
    ? "idle"
    : isFinished
      ? "finished"
      : isPlaying
        ? "playing"
        : "paused";

  const meta = STATUS_META[status];
  const progress = totalTime
    ? Math.min(100, Math.max(0, (elapsed / totalTime) * 100))
    : 0;

  const fillClass =
    status === "playing"
      ? "bg-linear-to-r from-fuchsia-500 to-indigo-500 shadow-[0_0_12px_rgba(129,140,248,0.45)] animate-pulse"
      : status === "paused"
        ? "bg-linear-to-r from-slate-300 to-slate-400"
        : "bg-linear-to-r from-slate-200 to-slate-300";

  const canControl = isHost && hasTrack;

  return (
    <section className="glass rounded-3xl p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-400">
              Now playing
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.badge}`}
            >
              {meta.label}
            </span>
          </div>

          <h3 className="mt-1 truncate text-xl font-semibold text-slate-800">
            {title ?? "Nothing playing yet"}
          </h3>

          <p className="mt-1 text-sm text-slate-500">{meta.hint}</p>
        </div>

        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title ?? "Current track"}
            className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-md"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-fuchsia-200 to-indigo-200 text-2xl">
            ♫
          </div>
        )}
      </div>

      <div
        role="progressbar"
        aria-label="Track progress"
        aria-valuemin={0}
        aria-valuemax={totalTime ?? 0}
        aria-valuenow={Math.round(elapsed)}
        className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/70 shadow-inner"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${fillClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mb-4 flex items-center justify-between text-xs tabular-nums">
        <span className="font-semibold text-slate-700">
          {formatTime(elapsed)}
          <span className="mx-1 font-normal text-slate-300">/</span>
          <span className="font-normal text-slate-500">
            {formatDuration(totalTime)}
          </span>
        </span>

        {status === "idle" ? (
          <span className="text-slate-400">No track selected</span>
        ) : status === "finished" ? (
          <span className="text-slate-400">Track ended</span>
        ) : (
          <span className="text-slate-400">
            {totalTime
              ? `${formatTime(Math.max(0, totalTime - elapsed))} left`
              : "Live"}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={!canControl}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow-md transition ${
            canControl
              ? "bg-linear-to-r from-fuchsia-500 to-indigo-500 hover:scale-[1.02] active:scale-[0.99]"
              : "cursor-not-allowed bg-slate-300"
          }`}
        >
          {meta.action}
        </button>

        {!isHost ? (
          <p className="text-xs text-slate-400">Only the host can control playback.</p>
        ) : null}
      </div>
    </section>
  );
}
