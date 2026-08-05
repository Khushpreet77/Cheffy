import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createGeminiClient(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    // Gemini's OpenAI-compatible endpoint lets us keep the existing
    // structured-output flow. This module is server-only, so the API key is
    // never included in the browser bundle.
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
