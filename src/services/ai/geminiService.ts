import { GoogleGenAI, Type } from "@google/genai";
import { buildValidationPrompt } from "./prompt";
import { parseValidationResult } from "./jsonUtils";
import { VocabInput, VocabValidationResult } from "./types";

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function validateWithGemini(formData: VocabInput): Promise<VocabValidationResult> {
  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: buildValidationPrompt(formData),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          type: { type: Type.STRING },
          level: { type: Type.STRING },
          ipa: { type: Type.STRING },
          meaning: { type: Type.STRING, description: "A concise definition of the word in Vietnamese" },
          context: { type: Type.STRING, description: "A brief description of the typical usage context for the word in English" },
          example: { type: Type.STRING, description: "A sentence demonstrating the usage of the word" },
          topic: { type: Type.STRING, description: "A single high-level category name" },
          isCorrect: { type: Type.BOOLEAN, description: "Whether the original input was mostly correct" },
          suggestions: { type: Type.STRING, description: "Brief explanation of changes made" }
        },
        required: ["word", "type", "level", "ipa", "meaning", "context", "example", "topic", "isCorrect", "suggestions"]
      }
    },
  });

  return parseValidationResult(response.text || "{}");
}