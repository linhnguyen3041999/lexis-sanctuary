import { createAuth } from "./auth";
import { ApiError, errorResponse, withSecurityHeaders } from "./http";
import { ensureGeneralTopic, requireUserId } from "./session";
import { handleTopics } from "./topics";

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const auth = createAuth(env, request);

  if (url.pathname.startsWith("/api/auth/")) {
    return auth.handler(request);
  }

  const userId = await requireUserId(auth, request);
  await ensureGeneralTopic(env.DB, userId);

  if (url.pathname === "/api/topics" || url.pathname.startsWith("/api/topics/")) {
    return handleTopics(request, env.DB, userId);
  }

  throw new ApiError(404, "NOT_FOUND", "Endpoint not found");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    try {
      return withSecurityHeaders(await handleApi(request, env));
    } catch (error) {
      return withSecurityHeaders(errorResponse(error, request));
    }
  },
} satisfies ExportedHandler<Env>;
