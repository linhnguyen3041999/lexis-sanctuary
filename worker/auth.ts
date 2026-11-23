import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import type { CloudflareGeolocation } from "better-auth-cloudflare";

const authSchema = {
  user: {
    modelName: "users",
    fields: {
      emailVerified: "email_verified",
      image: "image_url",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    modelName: "user_sessions",
    fields: {
      expiresAt: "expires_at",
      userId: "user_id",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    modelName: "oauth_accounts",
    fields: {
      accountId: "provider_account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    modelName: "verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    storeInDatabase: true,
  },
} as const;

export function createAuth(env: Env, request: Request) {
  const origin = env.BETTER_AUTH_URL || new URL(request.url).origin;
  const secure = origin.startsWith("https://");
  const incomingCf = request.cf && "colo" in request.cf ? request.cf : undefined;
  const asNullableString = (value: unknown): string | null => typeof value === "string" ? value : null;
  const cf: CloudflareGeolocation = {
    timezone: asNullableString(incomingCf?.timezone),
    city: asNullableString(incomingCf?.city),
    country: asNullableString(incomingCf?.country),
    region: asNullableString(incomingCf?.region),
    regionCode: asNullableString(incomingCf?.regionCode),
    colo: asNullableString(incomingCf?.colo),
    latitude: asNullableString(incomingCf?.latitude),
    longitude: asNullableString(incomingCf?.longitude),
  };

  return betterAuth({
    baseURL: origin,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [origin],
    ...withCloudflare(
      {
        d1Native: env.DB,
        autoDetectIpAddress: true,
        geolocationTracking: false,
        cf,
      },
      {
        ...authSchema,
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        },
        advanced: {
          useSecureCookies: secure,
          defaultCookieAttributes: {
            httpOnly: true,
            secure,
            sameSite: "lax",
          },
        },
        databaseHooks: {
          user: {
            create: {
              after: async (user) => {
                const now = Date.now();
                await env.DB.prepare(
                  `INSERT OR IGNORE INTO topics
                   (id, user_id, name, name_key, is_default, created_at, updated_at)
                   VALUES (?, ?, 'General', 'general', 1, ?, ?)`,
                ).bind(crypto.randomUUID(), user.id, now, now).run();
              },
            },
          },
        },
      },
    ),
  });
}

export type Auth = ReturnType<typeof createAuth>;
