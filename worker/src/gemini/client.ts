import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return client;
}

export interface InlineDocument {
  base64: string;
  mimeType: string;
}

export async function generateText(prompt: string, document?: InlineDocument): Promise<string> {
  const ai = getClient();

  const contents = document
    ? [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: document.mimeType, data: document.base64 } }] }]
    : prompt;

  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents,
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini retornou conteúdo vazio.");
  }

  return text;
}
