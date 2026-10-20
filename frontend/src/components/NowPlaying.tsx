import YouTube from "react-youtube";

type NowPlayingProps = {
  title: string | null;
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  isHost: boolean;
  onToggle: () => void;
};

export default function NowPlaying({
  title,
  videoId,
  isPlaying,
  currentTime,
  isHost,
  onToggle,
}: NowPlayingProps) {
  const progress = isPlaying
    ? ((currentTime % 30) / 30) * 100
    : (currentTime % 30 / 30) * 100;

  return (
    <section className="glass rounded-3xl p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-400">
            Now playing
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-800">
            {title ?? "Waiting for a track…"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {isPlaying ? "Synced across the room" : "Paused for everyone"}
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-fuchsia-200 to-indigo-200 text-2xl shadow-inner">
          ♫
        </div>
      </div>

      {videoId && (
        <div className="mb-5 overflow-hidden rounded-2xl">
          <YouTube
            videoId={videoId}
            opts={{
              width: "100%",
              playerVars: {
                playsinline: 1,
              },
            }}
          />
        </div>
      )}

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/70">
        <div
          className={`h-full rounded-full bg-linear-to-r from-fuchsia-400 to-indigo-500 transition-all duration-500 ${isPlaying ? "animate-pulse" : ""
            }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {currentTime.toFixed(1)}s synced
        </span>
        <button
          type="button"
          onClick={onToggle}
          disabled={!isHost}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow-md transition ${isHost
              ? "bg-linear-to-r from-fuchsia-500 to-indigo-500 hover:scale-[1.02] active:scale-[0.99]"
              : "cursor-not-allowed bg-slate-300"
            }`}
        >
          {isPlaying ? "Pause for all" : "Play for all"}
        </button>
      </div>

      {!isHost && (
        <p className="mt-3 text-xs text-slate-400">
          Only the host can control playback.
        </p>
      )}
    </section>
  );
}