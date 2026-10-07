// POST /api/touchup  multipart/form-data: platform, text? (caption/script/title), image? (thumbnail/post)
//   -> { feedback }
// Provider: Gemini (multimodal - it can look at the image and read the caption together)
import { Router } from "express";
import multer from "multer";
import { generateText, inlineImagePart } from "../providers/gemini.js";
import { getPlatform } from "../platforms.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

const router = Router();

router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    const { platform, text = "" } = req.body;
    if (!text && !req.file) return res.status(400).json({ error: "Send some text, an image, or both" });
    const p = getPlatform(platform);

    const parts = [];
    if (req.file) parts.push(inlineImagePart(req.file.buffer, req.file.mimetype));
    if (text) parts.push(`Creator's draft caption/script/title:\n${text}`);
    parts.push(
      "Review this content and give touch-up suggestions in Markdown with sections: " +
        "**What works**, **Fix first** (top 3 highest-impact changes), **Visual tweaks** (framing, colour, text overlay, thumbnail) " +
        "if an image is given, **Rewritten caption/hook**, and a **Score /10** for expected engagement."
    );

    const feedback = await generateText({
      system: `You are a sharp but encouraging ${p.name} content coach. ${p.guide}`,
      parts,
    });
    res.json({ feedback });
  } catch (err) {
    next(err);
  }
});

export default router;
