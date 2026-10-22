/** Formats a number of seconds as m:ss, or h:mm:ss for long tracks. */
export function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/** Formats an optional duration, falling back to a placeholder. */
export function formatDuration(duration: number | null | undefined): string {
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    return "--:--";
  }

  return formatTime(duration);
}
