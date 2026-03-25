import { buildValidationPrompt } from "./prompt";
import { parseValidationResult } from "./jsonUtils";
import { VocabInput, VocabValidationResult } from "./types";

export async function validateWithDeepSeek(formData: VocabInput): Promise<VocabValidationResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a precise linguistic assistant that always returns valid JSON.",
        },
        {
          role: "user",
          content: buildValidationPrompt(formData),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return parseValidationResult(content);
}
