// POST /api/script  { platform, topic, tone?, length?, audience? }  -> { script }
// Provider: OpenAI
import { Router } from "express";
import { generateText } from "../providers/openai.js";
import { getPlatform } from "../platforms.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { platform, topic, tone = "engaging", length = "medium", audience = "" } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });
    const p = getPlatform(platform);

    const instructions =
      `You are an expert ${p.name} content scriptwriter. ${p.guide}\n` +
      "Return the script in Markdown with: a HOOK, the main SCRIPT (with [visual/B-roll cues] in brackets), " +
      "a CALL TO ACTION, a suggested CAPTION and HASHTAGS. Keep it ready to film.";

    const input =
      `Topic: ${topic}\nTone: ${tone}\nLength: ${length}` + (audience ? `\nTarget audience: ${audience}` : "");

    const script = await generateText(instructions, input);
    res.json({ script });
  } catch (err) {
    next(err);
  }
});

export default router;
