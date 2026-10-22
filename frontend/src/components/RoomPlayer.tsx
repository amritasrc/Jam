import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import type { Options } from "youtube-player/dist/types";

/** How far the video may drift from the room before it is fixed. */
const DRIFT_LIMIT_SECONDS = 1.2;

/** How often the video is compared with the room position. */
const SYNC_INTERVAL_MS = 1000;

/** Ticks without sound before the user is asked to tap the player. */
const SILENT_TICKS = 2;

type RoomPlayerProps = {
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
};

export default function RoomPlayer({
  videoId,
  isPlaying,
  currentTime,
}: RoomPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const roomRef = useRef({ isPlaying, currentTime });
  const mutedRef = useRef(false);
  const pausedTicksRef = useRef(0);

  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [failed, setFailed] = useState(false);

  const opts = useMemo<Options>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },
    }),
    []
  );

  useEffect(() => {
    roomRef.current = { isPlaying, currentTime };
  }, [isPlaying, currentTime]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const play = useCallback(async () => {
    const player = playerRef.current;

    if (!player) return;

    try {
      await player.playVideo();
    } catch {
      // The browser can refuse to start the video without a user click.
    }
  }, []);

  const handleReady = useCallback(
    (event: YouTubeEvent) => {
      const player = event.target;

      playerRef.current = player;

      void player.setVolume(100);

      if (mutedRef.current) void player.mute();
      else void player.unMute();

      void player.seekTo(roomRef.current.currentTime, true);

      if (roomRef.current.isPlaying) void play();
    },
    [play]
  );

  const handleError = useCallback(() => {
    setFailed(true);
  }, []);

  // Follow the room play and pause state.
  useEffect(() => {
    const player = playerRef.current;

    if (!player) return;

    if (isPlaying) void play();
    else void player.pauseVideo();
  }, [isPlaying, play]);

  // The old player is dropped when the track changes.
  useEffect(() => {
    playerRef.current = null;
    pausedTicksRef.current = 0;
  }, [videoId]);

  // Mute or unmute the video.
  useEffect(() => {
    const player = playerRef.current;

    if (!player) return;

    if (muted) void player.mute();
    else void player.unMute();
  }, [muted]);

  // Keep the video on the room position and catch a blocked autoplay.
  useEffect(() => {
    if (!videoId) return;

    const id = window.setInterval(() => {
      const player = playerRef.current;

      if (!player) return;

      void (async () => {
        try {
          const [playerTime, playerState, isMuted] = await Promise.all([
            player.getCurrentTime(),
            player.getPlayerState(),
            player.isMuted(),
          ]);

          const room = roomRef.current;

          if (!room.isPlaying) {
            pausedTicksRef.current = 0;
            setNeedsTap(false);
            return;
          }

          const running =
            playerState === YouTube.PlayerState.PLAYING ||
            playerState === YouTube.PlayerState.BUFFERING;

          if (running) {
            pausedTicksRef.current = 0;
            setNeedsTap(false);
          } else if (playerState === YouTube.PlayerState.PAUSED) {
            pausedTicksRef.current += 1;

            if (pausedTicksRef.current >= SILENT_TICKS) {
              setNeedsTap(true);
            } else {
              void play();
            }
          } else {
            pausedTicksRef.current = 0;
          }

          if (isMuted && !mutedRef.current) {
            setNeedsTap(true);
          }

          const drift = Math.abs(playerTime - room.currentTime);

          if (drift > DRIFT_LIMIT_SECONDS) {
            await player.seekTo(room.currentTime, true);
          } else if (
            playerState === YouTube.PlayerState.ENDED &&
            room.isPlaying
          ) {
            await player.seekTo(room.currentTime, true);
          }
        } catch {
          // The player is still loading, try again on the next tick.
        }
      })();
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [play, videoId]);

  const handleToggleMute = () => {
    const player = playerRef.current;
    const nextMuted = !muted;

    setMuted(nextMuted);

    if (!player) return;

    if (nextMuted) void player.mute();
    else void player.unMute();
  };

  const handleTapToPlay = () => {
    const player = playerRef.current;

    if (!player) return;

    void player.unMute();
    void player.playVideo();
  };

  if (!videoId) return null;

  return (
    <div className="relative mb-5 aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 shadow-inner">
      <YouTube
        key={videoId}
        videoId={videoId}
        onReady={handleReady}
        onError={handleError}
        opts={opts}
        className="h-full w-full"
        iframeClassName="h-full w-full"
      />

      <button
        type="button"
        onClick={handleToggleMute}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80"
      >
        {muted ? "Sound off" : "Sound on"}
      </button>

      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-4 text-center text-sm text-white">
          This video cannot be played here.
        </div>
      ) : (
        needsTap && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              onClick={handleTapToPlay}
              className="pointer-events-auto flex flex-col items-center gap-1 rounded-2xl bg-black/70 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/85"
            >
              <span className="text-xl">🔊</span>
              Tap to play with sound
            </button>
          </div>
        )
      )}
    </div>
  );
}
