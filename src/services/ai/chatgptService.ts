import { buildValidationPrompt } from "./prompt";
import { parseValidationResult } from "./jsonUtils";
import { VocabInput, VocabValidationResult } from "./types";

export async function validateWithChatGPT(formData: VocabInput): Promise<VocabValidationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
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
    throw new Error(`ChatGPT API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return parseValidationResult(content);
}
