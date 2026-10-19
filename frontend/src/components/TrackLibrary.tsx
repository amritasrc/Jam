import { useEffect, useRef, useState } from "react";
import { searchSongs } from "../lib/api";
import type { Song } from "../lib/api";

type TrackLibraryProps = {
  isHost: boolean;
  currentSong: Song | null;
  onSelect: (song: Song) => void;
};

export default function TrackLibrary({
  isHost,
  currentSong,
  onSelect,
}: TrackLibraryProps) {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const timerRef = useRef<number | null>(null);
  const requestRef = useRef(0);

  const runSearch = async (term: string) => {
    const requestId = ++requestRef.current;

    setIsSearching(true);
    setError("");

    try {
      const results = await searchSongs(term);

      if (requestId !== requestRef.current) return;

      setSongs(results);
    } catch (err) {
      if (requestId !== requestRef.current) return;

      setSongs([]);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (requestId === requestRef.current) setIsSearching(false);
    }
  };

  const scheduleSearch = (term: string) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);

    if (!term) {
      requestRef.current += 1;
      setSongs([]);
      setError("");
      setIsSearching(false);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      void runSearch(term);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const term = query.trim();

    if (!term) return;

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);

    void runSearch(term);
  };

  return (
    <section className="glass rounded-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-200 to-sky-200 text-indigo-600">
          ♪
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Track library</h2>
          <p className="text-sm text-slate-500">
            Search YouTube and pick a track for the room
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            scheduleSearch(event.target.value.trim());
          }}
          placeholder="Search for a song…"
          aria-label="Search YouTube for a song"
          className="flex-1 rounded-2xl border border-white/70 bg-white/70 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        />
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200/50 transition hover:scale-[1.02] active:scale-[0.99]"
        >
          Search
        </button>
      </form>

      {isSearching && (
        <p className="mt-4 text-sm text-slate-400">Searching YouTube…</p>
      )}

      {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}

      {!isSearching && !error && songs.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">
          Search for a track to see YouTube results.
        </p>
      )}

      {songs.length > 0 && (
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
          {songs.map((song) => {
            const isCurrent = currentSong?.videoId === song.videoId;

            return (
              <li
                key={song.videoId}
                className={`flex items-center gap-3 rounded-2xl p-2 transition ${
                  isCurrent ? "bg-indigo-100/70" : "bg-white/50"
                }`}
              >
                {song.thumbnail ? (
                  <img
                    src={song.thumbnail}
                    alt={`${song.title} thumbnail`}
                    loading="lazy"
                    className="h-16 w-28 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-xl bg-white/60 text-xl text-slate-400">
                    ♫
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {song.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {song.channelTitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(song)}
                  disabled={!isHost || isCurrent}
                  className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-md transition ${
                    !isHost
                      ? "cursor-not-allowed bg-slate-300"
                      : isCurrent
                        ? "cursor-default bg-indigo-300"
                        : "bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:scale-[1.02] active:scale-[0.99]"
                  }`}
                >
                  {isCurrent ? "Playing" : "Play"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!isHost && (
        <p className="mt-3 text-xs text-slate-400">
          Only the host can pick tracks.
        </p>
      )}
    </section>
  );
}
