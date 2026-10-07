// POST /api/clips  multipart/form-data: video (file), platform, count?
//   -> { clips: [{ title, reason, start, end, url }] }
// How it works:
//   1. Upload the long video to Gemini, which watches it and picks the best moments (timestamps as JSON)
//   2. ffmpeg cuts those moments out locally (cropped to vertical for Reels/Shorts)
//   3. Clips are served from /clips/<jobId>/clipN.mp4
import { Router } from "express";
import multer from "multer";
import { spawn } from "node:child_process";
import { mkdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import ffmpegPath from "ffmpeg-static";
import { generateText, uploadFile, filePart } from "../providers/gemini.js";
import { getPlatform } from "../platforms.js";

const backendDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const UPLOAD_DIR = join(backendDir, "uploads");
export const CLIPS_DIR = join(backendDir, "clips");
mkdirSync(UPLOAD_DIR, { recursive: true });
mkdirSync(CLIPS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("video/")),
});

const router = Router();

router.post("/", upload.single("video"), async (req, res, next) => {
  const localPath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: "Upload a video file in the 'video' field" });
    const p = getPlatform(req.body.platform);
    const count = Math.min(Math.max(parseInt(req.body.count) || 3, 1), 6);

    // 1. Let Gemini watch the video and choose highlights
    const geminiFile = await uploadFile(localPath, req.file.mimetype);
    const raw = await generateText({
      json: true,
      parts: [
        filePart(geminiFile),
        `You are a short-form video editor. Pick the ${count} most engaging, self-contained moments ` +
          `from this video to repurpose as ${p.clip} for ${p.name}. Each moment needs a strong hook at its start. ` +
          `Return JSON: {"clips":[{"title":string,"reason":string,"start_seconds":number,"end_seconds":number}]}`,
      ],
    });
    const picks = JSON.parse(raw).clips || [];

    // 2. Cut each clip with ffmpeg
    const jobId = randomUUID();
    const outDir = join(CLIPS_DIR, jobId);
    mkdirSync(outDir, { recursive: true });
    const vertical = p.name !== "LinkedIn";

    const clips = [];
    for (const [i, c] of picks.entries()) {
      const start = Math.max(0, Number(c.start_seconds));
      const duration = Math.max(1, Number(c.end_seconds) - start);
      const outFile = join(outDir, `clip${i + 1}.mp4`);
      await cut(localPath, outFile, start, duration, vertical);
      clips.push({
        title: c.title,
        reason: c.reason,
        start,
        end: start + duration,
        url: `/clips/${jobId}/clip${i + 1}.mp4`,
      });
    }

    res.json({ clips });
  } catch (err) {
    next(err);
  } finally {
    if (localPath) try { unlinkSync(localPath); } catch {}
  }
});

function cut(input, output, start, duration, vertical) {
  const args = ["-y", "-ss", String(start), "-i", input, "-t", String(duration)];
  // vertical: centre-crop to 9:16 and scale to 720x1280; otherwise keep the original frame
  args.push("-vf", vertical ? "crop='min(iw,ih*9/16)':ih,scale=-2:1280,setsar=1" : "scale=-2:'min(1080,ih)',setsar=1");
  // yuv420p + faststart = plays in every browser and is accepted by Instagram/YouTube/LinkedIn
  args.push("-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", output);

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg failed: " + stderr.slice(-500)))));
  });
}

export default router;
