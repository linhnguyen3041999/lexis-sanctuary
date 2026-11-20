import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllVocabulary, getTopics, queryKeys } from "../api";
import { authClient } from "../auth-client";
import type { UserProgress } from "../types";

export function useAppData() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const topicsQuery = useQuery({
    queryKey: queryKeys.topics(user?.id ?? "anonymous"),
    queryFn: getTopics,
    enabled: Boolean(user),
  });
  const vocabularyQuery = useQuery({
    queryKey: queryKeys.vocabulary(user?.id ?? "anonymous"),
    queryFn: getAllVocabulary,
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
    loading: session.isPending || Boolean(user && (topicsQuery.isPending || vocabularyQuery.isPending)),
    error: topicsQuery.error ?? vocabularyQuery.error ?? session.error,
    topics: topicsQuery.data ?? [],
    vocabulary: vocabularyQuery.data ?? [],
    progress,
  };
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
