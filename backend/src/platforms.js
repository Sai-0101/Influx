// Platform-specific context injected into every prompt so the AI tailors output.
export const PLATFORMS = {
  instagram: {
    name: "Instagram",
    guide:
      "Instagram: Reels (vertical 9:16, hook in the first 1-2 seconds, 15-90s), carousels, and stories. " +
      "Captions should be punchy with a clear call to action; use 3-8 relevant hashtags. Visual-first audience.",
    image: "vertical 4:5 or 9:16 composition, bold and eye-catching, works on a phone screen",
    clip: "vertical 9:16 Reels, 15-60 seconds each",
  },
  linkedin: {
    name: "LinkedIn",
    guide:
      "LinkedIn: professional audience. Text posts open with a strong first line before the 'see more' cut, " +
      "use short paragraphs, share a lesson or insight, end with a question to drive comments. 3-5 hashtags max. " +
      "Native video and document carousels perform well.",
    image: "clean professional 1:1 or 4:5 graphic, minimal text, credible look",
    clip: "1:1 or 4:5 clips, 30-90 seconds, with an insight or takeaway",
  },
  youtube: {
    name: "YouTube",
    guide:
      "YouTube: long-form (8-20 min) needs a hook in the first 15 seconds, clear chapters, retention beats, and a CTA; " +
      "Shorts are vertical, under 60 seconds. Titles under 60 characters; thumbnails need a clear face/subject and 2-4 words max.",
    image: "16:9 thumbnail, high contrast, one clear subject, room for 2-4 large words",
    clip: "vertical YouTube Shorts, under 60 seconds each",
  },
};

export function getPlatform(key) {
  const p = PLATFORMS[(key || "").toLowerCase()];
  if (!p) {
    const err = new Error(`Unknown platform "${key}". Use one of: ${Object.keys(PLATFORMS).join(", ")}`);
    err.status = 400;
    throw err;
  }
  return p;
}
