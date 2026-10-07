// Gemini wrapper - used for image generation, video understanding (clips),
// touch-up feedback on images, and trends (Google Search grounding).
import { GoogleGenAI, createPartFromUri } from "@google/genai";

let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("GEMINI_API_KEY is not set in backend/.env");
    err.status = 503;
    throw err;
  }
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const textModel = () => process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
const imageModel = () => process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

/** Plain or multimodal text generation. `parts` can mix strings and inline/file parts. */
export async function generateText({ system, parts, json = false, search = false }) {
  const config = {};
  if (system) config.systemInstruction = system;
  if (json) config.responseMimeType = "application/json";
  if (search) config.tools = [{ googleSearch: {} }];

  const response = await getClient().models.generateContent({
    model: textModel(),
    contents: [{ role: "user", parts: parts.map(toPart) }],
    config,
  });
  return response.text;
}

/** Returns an array of { mimeType, base64 } images. */
export async function generateImage(prompt) {
  const response = await getClient().models.generateContent({
    model: imageModel(),
    contents: prompt,
  });
  const parts = response.candidates?.[0]?.content?.parts || [];
  const images = parts
    .filter((p) => p.inlineData?.data)
    .map((p) => ({ mimeType: p.inlineData.mimeType || "image/png", base64: p.inlineData.data }));
  const text = parts.filter((p) => p.text).map((p) => p.text).join("\n");
  return { images, text };
}

/** Upload a local file (e.g. a long video) to the Gemini Files API and wait until it's processed. */
export async function uploadFile(path, mimeType) {
  const ai = getClient();
  let file = await ai.files.upload({ file: path, config: { mimeType } });
  while (file.state === "PROCESSING") {
    await new Promise((r) => setTimeout(r, 3000));
    file = await ai.files.get({ name: file.name });
  }
  if (file.state === "FAILED") throw new Error("Gemini could not process the uploaded file");
  return file;
}

export function filePart(file) {
  return createPartFromUri(file.uri, file.mimeType);
}

export function inlineImagePart(buffer, mimeType) {
  return { inlineData: { mimeType, data: buffer.toString("base64") } };
}

function toPart(p) {
  return typeof p === "string" ? { text: p } : p;
}
