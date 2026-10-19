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
          skillTags: {
            type: Type.ARRAY,
            items: { type: Type.STRING, format: "enum", enum: ["speaking", "writing"] },
            description: "Useful English skill contexts for this word: speaking and/or writing",
          },
          type: { type: Type.STRING },
          level: { type: Type.STRING },
          ipa: {
            type: Type.STRING,
            description: "Standard IPA transcription enclosed in slashes, with ˈ for primary stress and periods between syllables; e.g. /ˈren.ə.veɪt/. Do not use respelling.",
          },
          synonyms: { type: Type.STRING, description: "A concise comma-separated list of related English words or phrases" },
          verbPattern: { type: Type.STRING, description: "A useful verb usage formula, or an empty string when not relevant" },
          collocations: { type: Type.STRING, description: "A markdown-style text block with common word combinations" },
          relatedForms: { type: Type.STRING, description: "A markdown-style text block with related word forms grouped by part of speech" },
          meaning: { type: Type.STRING, description: "A concise definition of the word in Vietnamese" },
          example: { type: Type.STRING, description: "A sentence demonstrating the usage of the word" },
          topic: { type: Type.STRING, description: "A single high-level category name" },
          isCorrect: { type: Type.BOOLEAN, description: "Whether the original input was mostly correct" },
          suggestions: { type: Type.STRING, description: "Brief explanation of changes made" }
        },
        required: ["word", "skillTags", "type", "level", "ipa", "synonyms", "verbPattern", "collocations", "relatedForms", "meaning", "example", "topic", "isCorrect", "suggestions"]
      }
    },
  });

  return parseValidationResult(response.text || "{}");
}