// POST /api/image  { platform, prompt, style? }  -> { images: [dataUrl], note }
// Provider: Cloudflare Workers AI (free) if configured, otherwise Gemini image model (paid tier).
// Force one with IMAGE_PROVIDER=cloudflare or IMAGE_PROVIDER=gemini
import { Router } from "express";
import * as gemini from "../providers/gemini.js";
import * as cloudflare from "../providers/cloudflare.js";
import { getPlatform } from "../platforms.js";

function generateImage(prompt) {
  const choice = process.env.IMAGE_PROVIDER || (cloudflare.isConfigured() ? "cloudflare" : "gemini");
  return choice === "cloudflare" ? cloudflare.generateImage(prompt) : gemini.generateImage(prompt);
}

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { platform, prompt, style = "" } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const p = getPlatform(platform);

    const fullPrompt =
      `Create an image for ${p.name}: ${prompt}. ` +
      `Format: ${p.image}.` + (style ? ` Style: ${style}.` : "");

    const { images, text } = await generateImage(fullPrompt);
    if (!images.length) return res.status(502).json({ error: "No image returned", note: text });

    res.json({
      images: images.map((img) => `data:${img.mimeType};base64,${img.base64}`),
      note: text,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
