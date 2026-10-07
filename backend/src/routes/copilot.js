// POST /api/copilot  { platform, messages: [{ role: "user"|"assistant", content }], profile? }
//   -> { reply }
// A chat assistant for new creators: posting times, reach, growth strategy, etc.
// Provider: OpenAI. The frontend keeps the conversation and sends the whole history each time.
import { Router } from "express";
import { generateText } from "../providers/openai.js";
import { getPlatform } from "../platforms.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { platform, messages = [], profile = {} } = req.body;
    if (!messages.length) return res.status(400).json({ error: "messages is required" });
    const p = getPlatform(platform);

    const history = messages
      .slice(-20)
      .filter((m) => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content }));

    const instructions =
      `You are C-Pilot, a friendly growth co-pilot for NEW ${p.name} creators. ${p.guide}\n` +
      "Give concrete, actionable answers: best posting days/times (state the time zone, and say these are general " +
      "starting points the creator should verify with their own analytics), posting frequency, formats that get reach, " +
      "hashtag/SEO tips, and first-1000-followers strategy. Use short bullet points. " +
      (profile.niche ? `Creator niche: ${profile.niche}. ` : "") +
      (profile.timezone ? `Creator time zone: ${profile.timezone}. ` : "") +
      (profile.audience ? `Audience location: ${profile.audience}. ` : "");

    const reply = await generateText(instructions, history);
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

export default router;
