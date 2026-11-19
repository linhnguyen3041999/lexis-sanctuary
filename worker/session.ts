import type { Auth } from "./auth";
import { ApiError } from "./http";

export async function requireUserId(auth: Auth, request: Request): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }
  return session.user.id;
}

export async function ensureGeneralTopic(db: D1Database, userId: string): Promise<void> {
  const now = Date.now();
  await db.prepare(
    `INSERT OR IGNORE INTO topics
     (id, user_id, name, name_key, is_default, created_at, updated_at)
     VALUES (?, ?, 'General', 'general', 1, ?, ?)`,
  ).bind(crypto.randomUUID(), userId, now, now).run();
}
