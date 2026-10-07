// GET /api/trends?platform=youtube&niche=tech  -> { summary, youtube?: [videos] }
// Sources:
//   - Gemini: trend summary for any platform (Instagram/LinkedIn have no public trends API).
//     With GEMINI_SEARCH=true it searches Google live (needs a paid Gemini tier); otherwise it
//     answers from the model's own knowledge, which can be a few months old.
//   - YouTube Data API v3 "mostPopular" chart: real trending videos (only if YOUTUBE_API_KEY is set)
// Results are cached for 30 minutes to save API quota.
import { Router } from "express";
import { generateText } from "../providers/gemini.js";
import { getPlatform } from "../platforms.js";

const router = Router();
const cache = new Map();
const TTL = 30 * 60 * 1000;

router.get("/", async (req, res, next) => {
  try {
    const { platform, niche = "" } = req.query;
    const p = getPlatform(platform);
    const region = process.env.TRENDS_REGION || "IN";
    const key = `${platform}|${niche}|${region}`;
    const liveSearch = process.env.GEMINI_SEARCH === "true";

    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return res.json(hit.data);

    const [summary, youtube] = await Promise.all([
      generateText({
        search: liveSearch,
        parts: [
          (liveSearch
            ? `Search the web and report what is trending on ${p.name} right now (this week)`
            : `Based on the most recent trends you know of, report what is trending on ${p.name}`) +
            (niche ? ` in the "${niche}" niche` : "") +
            ` for creators in region ${region}. Markdown sections: **Trending formats**, **Trending topics/hashtags**, ` +
            `**Audio/sounds** (if relevant), and **3 ready-to-use content ideas**. Be specific; skip generic advice.`,
        ],
      }),
      p.name === "YouTube" ? youtubeTrending(region) : Promise.resolve(undefined),
    ]);

    const data = { summary, youtube };
    cache.set(key, { at: Date.now(), data });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

async function youtubeTrending(region) {
  if (!process.env.YOUTUBE_API_KEY) return undefined;
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.search = new URLSearchParams({
    part: "snippet,statistics",
    chart: "mostPopular",
    regionCode: region,
    maxResults: "10",
    key: process.env.YOUTUBE_API_KEY,
  });
  const r = await fetch(url);
  if (!r.ok) return undefined;
  const json = await r.json();
  return json.items.map((v) => ({
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    views: Number(v.statistics.viewCount || 0),
    thumbnail: v.snippet.thumbnails?.medium?.url,
    url: `https://www.youtube.com/watch?v=${v.id}`,
  }));
}

export default router;
