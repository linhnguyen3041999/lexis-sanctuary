import { z } from "zod";

const MAX_JSON_BYTES = 64 * 1024;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

async function readBoundedBody(request: Request): Promise<string> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_JSON_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_JSON_BYTES) {
      await reader.cancel();
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

export async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let input: unknown;
  try {
    const body = await readBoundedBody(request);
    input = JSON.parse(body || "{}");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error);
    const fieldErrors = Object.fromEntries(
      Object.entries(flattened.fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])),
    );
    throw new ApiError(422, "VALIDATION_ERROR", "Invalid input", fieldErrors);
  }
  return parsed.data;
}

export function errorResponse(error: unknown, request: Request): Response {
  if (error instanceof ApiError) {
    return json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
    }, error.status);
  }

  console.error(JSON.stringify({
    message: "unhandled request error",
    method: request.method,
    path: new URL(request.url).pathname,
    error: error instanceof Error ? error.message : "Unknown error",
  }));
  return json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
}

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
