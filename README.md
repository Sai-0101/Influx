# INFLUX — AI toolkit for creators

Six tools for Instagram, LinkedIn and YouTube creators: **Scripting, ImageGen, VideoClip, Muse (touch-ups), Trends, C-Pilot**.


Link to see the project**(https://github.com/Sai-0101/Influx)** 


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


**Note:The api are not added so the ai will not work **
