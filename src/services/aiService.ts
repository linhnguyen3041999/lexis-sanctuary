import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyCifzoFShaUsJJ0Bpu_U5MF1GKQknESr7M" });

export interface VocabValidationResult {
  word: string;
  type: string;
  ipa: string;
  meaning: string;
  context: string;
  example: string;
  topic: string;
  isCorrect: boolean;
  suggestions: string;
}

export async function validateAndCompleteVocab(formData: any): Promise<VocabValidationResult> {
  const { word, type, ipa, meaning, context, example } = formData;

  const prompt = `
    You are a linguistics expert. Validate and complete the following English vocabulary entry.
    Word: ${word}
    Type: ${type || "unknown"}
    IPA: ${ipa || "unknown"}
    Meaning: ${meaning || "unknown"}
    Context: ${context || "unknown"}
    Example: ${example || "unknown"}

    If any field is missing or incorrect, provide the correct information.
    Also, categorize this word into a single, high-level topic (e.g., "Daily Life", "Technology", "Business", "Nature", "Travel", "Emotions", etc.).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          type: { type: Type.STRING },
          ipa: { type: Type.STRING },
          meaning: { type: Type.STRING },
          context: { type: Type.STRING },
          example: { type: Type.STRING },
          topic: { type: Type.STRING, description: "A single high-level category name" },
          isCorrect: { type: Type.BOOLEAN, description: "Whether the original input was mostly correct" },
          suggestions: { type: Type.STRING, description: "Brief explanation of changes made" }
        },
        required: ["word", "type", "ipa", "meaning", "context", "example", "topic", "isCorrect", "suggestions"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
