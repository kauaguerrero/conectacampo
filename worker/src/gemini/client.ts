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

export async function generateText(prompt: string): Promise<string> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: prompt,
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini retornou conteúdo vazio.");
  }

  return text;
}
