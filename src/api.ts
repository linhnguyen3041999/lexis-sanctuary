import type { SRSLevel, SkillTag, Topic, Vocabulary } from "./types";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {
      error?: { code?: string; message?: string; fieldErrors?: Record<string, string[]> };
    } | null;
    throw new ApiClientError(
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
      payload?.error?.message ?? "Request failed",
      payload?.error?.fieldErrors,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const queryKeys = {
  topics: (userId: string) => ["session", userId, "topics"] as const,
  vocabulary: (userId: string) => ["session", userId, "vocabulary"] as const,
  dashboard: (userId: string) => ["session", userId, "dashboard"] as const,
  due: (userId: string) => ["session", userId, "study", "due"] as const,
};

export async function getTopics(): Promise<Topic[]> {
  return (await apiRequest<{ topics: Topic[] }>("/api/topics")).topics;
}

export async function createTopic(name: string): Promise<Topic> {
  return (await apiRequest<{ topic: Topic }>("/api/topics", {
    method: "POST",
    body: JSON.stringify({ name }),
  })).topic;
}

export async function updateTopic(id: string, name: string): Promise<Topic> {
  return (await apiRequest<{ topic: Topic }>(`/api/topics/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  })).topic;
}

export function deleteTopic(id: string): Promise<void> {
  return apiRequest(`/api/topics/${encodeURIComponent(id)}`, { method: "DELETE" });
}

interface VocabularyPage {
  vocabulary: Vocabulary[];
  nextCursor: string | null;
}

export async function getAllVocabulary(): Promise<Vocabulary[]> {
  const vocabulary: Vocabulary[] = [];
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({ limit: "50" });
    if (cursor) params.set("cursor", cursor);
    const page: VocabularyPage = await apiRequest(`/api/vocabulary?${params}`);
    vocabulary.push(...page.vocabulary);
    cursor = page.nextCursor;
  } while (cursor);
  return vocabulary;
}

export interface VocabularyPayload {
  topicId: string;
  word: string;
  type: string;
  skillTags: SkillTag[];
  level: string;
  ipa: string;
  synonyms: string;
  verbPattern: string;
  collocations: string;
  relatedForms: string;
  meaning: string;
  example: string;
}

export async function createVocabulary(input: VocabularyPayload): Promise<Vocabulary> {
  return (await apiRequest<{ vocabulary: Vocabulary }>("/api/vocabulary", {
    method: "POST",
    body: JSON.stringify(input),
  })).vocabulary;
}

export async function updateVocabulary(id: string, input: Partial<VocabularyPayload>): Promise<Vocabulary> {
  return (await apiRequest<{ vocabulary: Vocabulary }>(`/api/vocabulary/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })).vocabulary;
}

export function deleteVocabulary(id: string): Promise<void> {
  return apiRequest(`/api/vocabulary/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function bulkDeleteVocabulary(ids: string[]): Promise<{ deleted: number }> {
  return apiRequest("/api/vocabulary/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function reviewVocabulary(wordId: string, rating: SRSLevel): Promise<Vocabulary> {
  return (await apiRequest<{ vocabulary: Vocabulary }>(
    `/api/study/${encodeURIComponent(wordId)}/review`,
    { method: "POST", body: JSON.stringify({ rating }) },
  )).vocabulary;
}

export async function validateVocabularyWithAi(input: Omit<VocabularyPayload, "topicId"> & {
  availableTopics: string[];
  provider?: "gemini" | "openai" | "deepseek";
}) {
  return (await apiRequest<{ result: Record<string, unknown> }>("/api/ai/validate", {
    method: "POST",
    body: JSON.stringify({ ...input, provider: input.provider ?? "gemini" }),
  })).result;
}
