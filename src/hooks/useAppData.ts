import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardSummary, getTopics, getVocabularyPage, queryKeys, type VocabularyListQuery } from "../api";
import { authClient } from "../auth-client";
import type { UserProgress } from "../types";

export function useAppData({ includeVocabulary = false }: { includeVocabulary?: boolean } = {}) {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const topicsQuery = useQuery({
    queryKey: queryKeys.topics(user?.id ?? "anonymous"),
    queryFn: getTopics,
    enabled: Boolean(user),
  });
  const vocabularyQuery = useQuery({
    queryKey: queryKeys.vocabulary(user?.id ?? "anonymous"),
    queryFn: async () => {
      const vocabulary = [];
      let cursor: string | undefined;
      do {
        const page = await getVocabularyPage({ cursor, limit: 50 });
        vocabulary.push(...page.vocabulary);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return vocabulary;
    },
    enabled: Boolean(user && includeVocabulary),
  });
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(user?.id ?? "anonymous"),
    queryFn: getDashboardSummary,
    enabled: Boolean(user),
  });
  const progress = useMemo<UserProgress[]>(() => (vocabularyQuery.data ?? []).map((word) => ({
    id: word.id,
    wordId: word.id,
    interval: word.progress.intervalDays,
    repetition: word.progress.repetition,
    easeFactor: word.progress.easeFactor,
    nextReview: word.progress.nextReviewAt,
    status: word.progress.status,
  })), [vocabularyQuery.data]);

  return {
    user,
    loading: session.isPending || Boolean(user && (topicsQuery.isPending || (includeVocabulary && vocabularyQuery.isPending))),
    error: topicsQuery.error ?? vocabularyQuery.error ?? session.error,
    topics: topicsQuery.data ?? [],
    summary: dashboardQuery.data,
    vocabulary: vocabularyQuery.data ?? [],
    progress,
  };
}

export function useVocabularyPage(userId: string | undefined, query: VocabularyListQuery) {
  return useQuery({
    queryKey: [...queryKeys.vocabulary(userId ?? "anonymous"), "page", query],
    queryFn: () => getVocabularyPage(query),
    enabled: Boolean(userId),
  });
}

export function replaceVocabularyInCache(queryClient: ReturnType<typeof useQueryClient>, userId: string | undefined, vocabulary: import("../types").Vocabulary) {
  if (!userId) return;
  queryClient.setQueriesData<import("../types").Vocabulary[]>({ queryKey: queryKeys.vocabulary(userId) }, (current) => {
    if (!Array.isArray(current)) return current;
    return current.map((word) => word.id === vocabulary.id ? vocabulary : word);
  });
  queryClient.setQueriesData<{ vocabulary: import("../types").Vocabulary[]; nextCursor: string | null }>(
    { queryKey: queryKeys.vocabulary(userId) },
    (current) => current && Array.isArray(current.vocabulary)
      ? { ...current, vocabulary: current.vocabulary.map((word) => word.id === vocabulary.id ? vocabulary : word) }
      : current,
  );
}

export function useInvalidateAppData(userId?: string) {
  const queryClient = useQueryClient();
  return async () => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.topics(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.vocabulary(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.due(userId) }),
    ]);
  };
}
