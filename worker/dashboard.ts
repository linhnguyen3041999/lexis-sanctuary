import { ApiError, json } from "./http";

interface SummaryRow {
  topic_count: number;
  vocabulary_count: number;
  due_count: number;
  new_count: number;
  learning_count: number;
  good_count: number;
  mastered_count: number;
}

export async function handleDashboard(
  request: Request,
  db: D1Database,
  userId: string,
): Promise<Response> {
  if (request.method !== "GET") throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
  const now = Date.now();
  const row = await db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM topics WHERE user_id = ?) AS topic_count,
       COUNT(*) AS vocabulary_count,
       COALESCE(SUM(CASE WHEN p.next_review_at <= ? THEN 1 ELSE 0 END), 0) AS due_count,
       COALESCE(SUM(CASE WHEN p.status = 'new' THEN 1 ELSE 0 END), 0) AS new_count,
       COALESCE(SUM(CASE WHEN p.status = 'learning' THEN 1 ELSE 0 END), 0) AS learning_count,
       COALESCE(SUM(CASE WHEN p.status = 'good' THEN 1 ELSE 0 END), 0) AS good_count,
       COALESCE(SUM(CASE WHEN p.status = 'mastered' THEN 1 ELSE 0 END), 0) AS mastered_count
     FROM vocabulary v
     JOIN learning_progress p ON p.vocabulary_id = v.id
     WHERE v.user_id = ?`,
  ).bind(userId, now, userId).first<SummaryRow>();
  return json({
    summary: {
      topics: row?.topic_count ?? 0,
      vocabulary: row?.vocabulary_count ?? 0,
      due: row?.due_count ?? 0,
      byStatus: {
        new: row?.new_count ?? 0,
        learning: row?.learning_count ?? 0,
        good: row?.good_count ?? 0,
        mastered: row?.mastered_count ?? 0,
      },
    },
  });
}
