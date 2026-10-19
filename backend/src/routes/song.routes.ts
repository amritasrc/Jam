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

const router = Router();

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

    res.json({
      success: true,
      songs,
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
