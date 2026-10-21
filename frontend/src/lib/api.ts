import axios from "axios";
import { API_BASE_URL } from "./config";

export type Song = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail?: string;
  duration?: number;
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
};

function decodeEntities(text: string) {
  return text.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (match) => ENTITIES[match] ?? match);
}

export async function searchSongs(query: string): Promise<Song[]> {
  const response = await axios.get(
    `${API_BASE_URL}/api/songs/search`,
    { params: { q: query } }
  );

  const payload = response.data as {
    success?: boolean;
    message?: string;
    songs?: Song[];
  };

  if (!payload?.success) {
    throw new Error(payload?.message ?? "Unable to search YouTube right now.");
  }

  return (payload.songs ?? []).map((song) => ({
    ...song,
    title: decodeEntities(song.title),
    channelTitle: decodeEntities(song.channelTitle ?? ""),
  }));
}
