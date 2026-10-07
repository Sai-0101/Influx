// INFLUX backend.
// Serves the frontend (repo root) AND the /api routes from one server, so the
// frontend can call fetch("/api/...") with no CORS setup and API keys stay server-side.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import scriptRoute from "./src/routes/script.js";
import imageRoute from "./src/routes/image.js";
import clipsRoute, { CLIPS_DIR } from "./src/routes/clips.js";
import touchupRoute from "./src/routes/touchup.js";
import trendsRoute from "./src/routes/trends.js";
import copilotRoute from "./src/routes/copilot.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = join(__dirname, "..");

const app = express();
app.use(cors()); // only matters if you host the frontend on a different domain
app.use(express.json({ limit: "2mb" }));

// ---- API ----
app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    text: process.env.OPENAI_API_KEY
      ? process.env.OPENAI_BASE_URL || "openai"
      : process.env.GEMINI_API_KEY ? "gemini (fallback)" : "NOT CONFIGURED",
    gemini: Boolean(process.env.GEMINI_API_KEY),
    images: process.env.IMAGE_PROVIDER ||
      (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN ? "cloudflare" : "gemini"),
    trendsLiveSearch: process.env.GEMINI_SEARCH === "true",
    youtube: Boolean(process.env.YOUTUBE_API_KEY),
  })
);
app.use("/api/script", scriptRoute);    // OpenAI-compatible (OpenAI / Groq / GitHub Models) or Gemini
app.use("/api/image", imageRoute);      // Cloudflare Workers AI (free) or Gemini image
app.use("/api/clips", clipsRoute);      // Gemini video understanding + ffmpeg
app.use("/api/touchup", touchupRoute);  // Gemini multimodal
app.use("/api/trends", trendsRoute);    // Gemini (+ Google Search if GEMINI_SEARCH=true), YouTube Data API
app.use("/api/copilot", copilotRoute);  // same text provider as Scripting
app.use("/api", (_req, res) => res.status(404).json({ error: "Unknown API route" }));

// Generated clips
app.use("/clips", express.static(CLIPS_DIR));

// ---- Frontend ----
app.use("/backend", (_req, res) => res.status(404).end()); // never serve backend source / .env
app.use(express.static(FRONTEND_DIR, { dotfiles: "deny", index: "App.html" }));

// ---- Errors -> JSON the frontend can show ----
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);
  res.status(status).json({ error: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`INFLUX running at http://localhost:${PORT}`));
