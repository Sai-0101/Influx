// Free image generation via Cloudflare Workers AI (FLUX.1 schnell).
// Free plan: 10,000 "neurons" per day, roughly a few hundred images.
// Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (token with "Workers AI" permission).
export function isConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

/** Returns { images: [{ mimeType, base64 }], text } - same shape as gemini.generateImage */
export async function generateImage(prompt) {
  const model = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 8 }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.result?.image) {
    const msg = data.errors?.[0]?.message || `Cloudflare request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }
  return { images: [{ mimeType: "image/jpeg", base64: data.result.image }], text: "" };
}
