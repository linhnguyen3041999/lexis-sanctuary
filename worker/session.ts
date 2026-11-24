import type { Auth } from "./auth";
import { ApiError } from "./http";

export async function requireUserId(auth: Auth, request: Request): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }
  return session.user.id;
}
