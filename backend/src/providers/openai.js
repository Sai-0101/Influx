// Text generation for Scripting and C-Pilot.
// Works with ANY OpenAI-compatible API by changing OPENAI_BASE_URL:
//   - OpenAI (paid):            leave OPENAI_BASE_URL empty
//   - Groq (free tier):         https://api.groq.com/openai/v1   model e.g. openai/gpt-oss-120b
//   - GitHub Models (free):     https://models.github.ai/inference  model id from github.com/marketplace/models
// If no OPENAI_API_KEY is set but GEMINI_API_KEY is, it falls back to Gemini (free tier).
import OpenAI from "openai";
import * as gemini from "./gemini.js";

let client = null;
function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return client;
}

/**
 * @param {string} instructions - system prompt
 * @param {string|Array} input - user prompt, or an array of {role, content} messages
 */
export async function generateText(instructions, input) {
  const messages = typeof input === "string" ? [{ role: "user", content: input }] : input;

  if (!process.env.OPENAI_API_KEY) {
    if (process.env.GEMINI_API_KEY) return geminiFallback(instructions, messages);
    const err = new Error("Set OPENAI_API_KEY (OpenAI, Groq or GitHub Models) or GEMINI_API_KEY in backend/.env");
    err.status = 503;
    throw err;
  }

  // Chat Completions is supported by OpenAI, Groq, GitHub Models, OpenRouter, etc.
  const completion = await getClient().chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-6-luna",
    messages: [{ role: "system", content: instructions }, ...messages],
  });
  return completion.choices[0].message.content;
}

function geminiFallback(instructions, messages) {
  const transcript = messages
    .map((m) => (messages.length > 1 ? `${m.role === "user" ? "User" : "Assistant"}: ` : "") + m.content)
    .join("\n\n");
  return gemini.generateText({ system: instructions, parts: [transcript] });
}
