import { Router } from "express";
import axios from "axios";
import type { Song } from "../services/roomService.js";

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { medium?: { url?: string } };
  };
};

function parseDuration(duration: string): number {
  const match = duration.match(
    /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  );

  if (!match) return 0;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  return hours * 3600 + minutes * 60 + seconds;
}

const router = Router();

router.get("/autoplay", async (req, res) => {
  const query = req.query.q;
  const exclude = req.query.exclude;
  const recentlyPlayed = req.query.recentlyPlayed;

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      success: false,
      message: "YouTube API key is not configured.",
    });
    return;
  }

  // Build exclusion set
  const excludedIds = new Set<string>();
  if (typeof exclude === "string" && exclude.trim()) {
    excludedIds.add(exclude.trim());
  }
  if (typeof recentlyPlayed === "string" && recentlyPlayed.trim()) {
    recentlyPlayed
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .forEach((id) => excludedIds.add(id));
  }

  // Generate varied candidate queries for better recommendations
  const candidateQueries: string[] = [];
  if (typeof query === "string" && query.trim()) {
    const trimmed = query.trim();
    candidateQueries.push(`${trimmed} music`);
    candidateQueries.push(`${trimmed} official video`);
    // Try to be more varied - just the query without forcing "music" at end
    candidateQueries.push(trimmed);
  }
  // Fallback query
  if (candidateQueries.length === 0) {
    candidateQueries.push("popular music");
  }

  // Deduplicate queries
  const uniqueQueries = Array.from(new Set(candidateQueries));

  try {
    const allCandidates: Song[] = [];
    const seenVideoIds = new Set<string>();

    // Try multiple query strategies to get more varied results
    for (const q of uniqueQueries) {
      try {
        const response = await axios.get(
          "https://www.googleapis.com/youtube/v3/search",
          {
            params: {
              part: "snippet",
              q: q,
              type: "video",
              videoCategoryId: "10",
              maxResults: 10,
              key: apiKey,
            },
          }
        );

        const items = (response.data.items ?? []) as YouTubeSearchItem[];

        for (const item of items) {
          if (
            !item.id?.videoId ||
            excludedIds.has(item.id.videoId) ||
            seenVideoIds.has(item.id.videoId)
          ) {
            continue;
          }
          seenVideoIds.add(item.id.videoId);
          allCandidates.push({
            videoId: item.id.videoId,
            title: item.snippet?.title ?? "Unknown track",
            channelTitle: item.snippet?.channelTitle ?? "",
            thumbnail: item.snippet?.thumbnails?.medium?.url,
          });
        }
      } catch (err) {
        // Continue trying other queries if one fails
        continue;
      }
    }

    if (allCandidates.length === 0) {
      res.json({ success: true, song: null });
      return;
    }

    // Randomly select from multiple valid candidates for variety
    const randomIndex = Math.floor(Math.random() * allCandidates.length);
    const selectedSong = allCandidates[randomIndex];

    const durationResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          part: "contentDetails",
          id: selectedSong.videoId,
          key: apiKey,
        },
      }
    );

    const duration = durationResponse.data.items?.[0]?.contentDetails?.duration;

    res.json({
      success: true,
      song: {
        ...selectedSong,
        duration: typeof duration === "string" ? parseDuration(duration) : undefined,
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "YouTube autoplay search failed:",
        error.response?.data ?? error.message
      );
    } else {
      console.error("Unexpected autoplay search error:", error);
    }

    res.status(502).json({
      success: false,
      message: "Unable to find an autoplay song right now.",
    });
  }
});

router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (typeof query !== "string" || !query.trim()) {
    res.status(400).json({
      success: false,
      message: "Please provide a song search query.",
    });
    return;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      success: false,
      message: "YouTube API key is not configured.",
    });
    return;
  }

  try {
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: query.trim(),
          type: "video",
          maxResults: 10,
          key: apiKey,
        },
      }
    );

    const items = (response.data.items ?? []) as YouTubeSearchItem[];

    const songs: Song[] = items
      .filter((item): item is YouTubeSearchItem & { id: { videoId: string } } =>
        Boolean(item.id?.videoId)
      )
      .map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet?.title ?? "Unknown track",
        channelTitle: item.snippet?.channelTitle ?? "",
        thumbnail: item.snippet?.thumbnails?.medium?.url,
      }));

    const videoIds = songs.map((song) => song.videoId);

    const durationResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          part: "contentDetails",
          id: videoIds.join(","),
          key: apiKey,
        },
      }
    );

    const durationMap = new Map<string, number>(
      (durationResponse.data.items ?? []).map(
        (item: { id: string; contentDetails: { duration: string } }) => [
          item.id,
          parseDuration(item.contentDetails.duration),
        ]
      )
    );

    const songsWithDuration: Song[] = songs.map((song) => ({
      ...song,
      duration: durationMap.get(song.videoId),
    }));

    res.json({
      success: true,
      songs: songsWithDuration,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "YouTube search failed:",
        error.response?.data ?? error.message
      );
    } else {
      console.error("Unexpected song search error:", error);
    }

    res.status(502).json({
      success: false,
      message: "Unable to search YouTube right now.",
    });
  }
});

export default router;
