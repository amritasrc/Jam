import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import type { Options } from "youtube-player/dist/types";

/** How far the audio may drift from the room before it is fixed. */
const DRIFT_LIMIT_SECONDS = 1.2;

/** How often the player is compared with the room position. */
const SYNC_INTERVAL_MS = 1000;

/** Ticks without sound before the user is asked to tap the player. */
const SILENT_TICKS = 2;

type RoomPlayerProps = {
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  muted: boolean;
};

export default function RoomPlayer({
  videoId,
  isPlaying,
  currentTime,
  muted,
}: RoomPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const roomRef = useRef({ isPlaying, currentTime });
  const mutedRef = useRef(muted);
  const pausedTicksRef = useRef(0);

  const [needsTap, setNeedsTap] = useState(false);
  const [failed, setFailed] = useState(false);

  const opts = useMemo<Options>(
    () => ({
      width: "640",
      height: "360",
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        controls: 0,
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

  // Mute or unmute the audio.
  useEffect(() => {
    const player = playerRef.current;

    if (!player) return;

    if (muted) void player.mute();
    else void player.unMute();
  }, [muted]);

  // Keep the audio on the room position and catch a blocked autoplay.
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

  const handleTapToPlay = () => {
    const player = playerRef.current;

    if (!player) return;

    void player.unMute();
    void player.playVideo();
  };

  // Recover playback when the user returns to this tab.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;

      const player = playerRef.current;
      const room = roomRef.current;

      if (!player || !room.isPlaying) return;

      try {
        const playerTime = await player.getCurrentTime();
        const drift = Math.abs(playerTime - room.currentTime);

        if (drift > DRIFT_LIMIT_SECONDS) {
          await player.seekTo(room.currentTime, true);
        }

        await player.playVideo();

        if (mutedRef.current) {
          await player.mute();
        } else {
          await player.unMute();
        }

        setNeedsTap(false);
        pausedTicksRef.current = 0;
      } catch {
        // The regular sync check will retry if playback is still unavailable.
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (!videoId) return null;

  return (
    <>
      {/* The player stays off screen, only the audio is heard. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-9999px] top-0 h-90 w-160"
      >
        <YouTube
          key={videoId}
          videoId={videoId}
          onReady={handleReady}
          onError={handleError}
          opts={opts}
          className="h-full w-full"
          iframeClassName="h-full w-full"
        />
      </div>

      {failed ? (
        <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          This track cannot be played here.
        </p>
      ) : (
        needsTap && (
          <button
            type="button"
            onClick={handleTapToPlay}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100"
          >
            🔊 Tap to play with sound
          </button>
        )
      )}
    </>
  );
}
