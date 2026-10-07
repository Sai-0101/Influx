# INFLUX — AI toolkit for creators

Six tools for Instagram, LinkedIn and YouTube creators: **Scripting, ImageGen, VideoClip, Muse (touch-ups), Trends, C-Pilot**.

## Run it

```bash
cd backend
npm install
cp .env.example .env      # then paste your API keys into .env
npm start                 # or: npm run dev  (auto-restarts on save)
```

Open **http://localhost:3000** — the backend serves the frontend too, so everything runs from one command.
Check **http://localhost:3000/api/health** to see which keys are loaded.

### Free setup (no credits needed)

| Key | Where to get it | Powers | Free limit |
|---|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | VideoClip, Muse, Trends (and Scripting/C-Pilot if you skip Groq) | Free tier on Flash models |
| `OPENAI_API_KEY` = a **Groq** key | https://console.groq.com/keys | Scripting, C-Pilot (fast) | ~1,000 requests/day per model |
| `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → "Workers AI" | ImageGen (FLUX.1 schnell) | 10,000 neurons/day |
| `YOUTUBE_API_KEY` *(optional)* | Google Cloud console → enable "YouTube Data API v3" | Real YouTube trending videos | 10,000 units/day |

Minimum to demo everything except images: just `GEMINI_API_KEY`.

Free-tier caveats: Gemini's free tier does **not** include image generation or live Google Search grounding, which is why images use Cloudflare and Trends uses the model's own knowledge (`GEMINI_SEARCH=false`). Google may use free-tier inputs to improve its products, so don't upload anything private.

### Paid setup
OpenAI key in `OPENAI_API_KEY` (empty `OPENAI_BASE_URL`), `IMAGE_PROVIDER=gemini`, `GEMINI_SEARCH=true` on a billed Gemini project.

> Never put API keys in the frontend JS. Anyone can read them in the browser. They live only in `backend/.env`, which is git-ignored.

## How the frontend works

The whole site is one page, `App.html`, styled like an iPad: a home screen with widgets and app icons, and each AI tool opens full-screen as an app (press the bar at the bottom, the Home link, or Esc to go back).

- Every app has a link: `App.html#/script/linkedin`, `#/clips/youtube`, `#/copilot` and so on. The browser back button works.
- The Instagram / LinkedIn / YouTube switch at the top of each app changes the format, prompts and output for that platform. The choice is remembered.
- Apps hand work to each other: Scripting → "Make a visual" opens ImageGen with the topic; ImageGen → "Get feedback in Muse"; Trends → "Script an idea".
- The "AI engines" widget on the home screen reads `/api/health`, so you can see which keys are working before a demo.
- On phones the iPad frame drops away and the apps go full screen.

All calls go through `api()` near the top of `app.js`. If you host the frontend separately (Netlify / GitHub Pages / VS Code Live Server), set `API_BASE` there to your backend URL. CORS is already enabled. Set `CONTACT_EMAIL` there to show a contact button in the About app.

The old `socialmedia1.html`, `socialmedia3.html` and `tool.html` now just redirect into `App.html`, so old links keep working.

## API

| Feature | Endpoint | Body | Model |
|---|---|---|---|
| Scripting | `POST /api/script` | JSON `{ platform, topic, tone, length, audience }` | Groq / OpenAI / Gemini |
| ImageGen | `POST /api/image` | JSON `{ platform, prompt, style }` | Cloudflare FLUX (free) / Gemini image |
| VideoClip | `POST /api/clips` | multipart `video`, `platform`, `count` | Gemini (picks moments) + ffmpeg (cuts) |
| Muse | `POST /api/touchup` | multipart `image?`, `text?`, `platform` | Gemini (vision) |
| Trends | `GET /api/trends?platform=&niche=` | — | Gemini (+ Search if paid), YouTube API |
| C-Pilot | `POST /api/copilot` | JSON `{ platform, messages:[{role,content}], profile }` | Groq / OpenAI / Gemini |

`platform` is `instagram`, `linkedin` or `youtube`. Errors always come back as `{ "error": "..." }`.

Swap models by editing `OPENAI_TEXT_MODEL`, `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL` in `.env`. To move a feature to another provider, change the import at the top of its file in `backend/src/routes/`.

## Project layout

```
App.html     the whole site (home screen + apps)
app.css      design: device frame, wallpaper, home screen, app layouts
app.js       routing, home screen, the seven apps, API calls
backend/
  server.js                 Express app: static frontend + /api routes
  src/platforms.js          per-platform guidance injected into every prompt
  src/providers/openai.js   any OpenAI-compatible API (OpenAI, Groq, GitHub Models), falls back to Gemini
  src/providers/cloudflare.js  free image generation
  src/providers/gemini.js   Gemini wrapper
  src/routes/*.js           one file per feature
```
