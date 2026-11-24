import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";

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

function buildAuth(env: Env) {
  const origin = env.BETTER_AUTH_URL;
  const secure = origin.startsWith("https://");

  return betterAuth({
    baseURL: origin,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [origin],
    ...withCloudflare(
      {
        d1Native: env.DB,
        // Keeping the auth instance at isolate scope prevents Better Auth from
        // rebuilding its D1 adapter (and inspecting the schema) for every API call.
        // IP collection is not used by this application, so it need not make auth
        // request-specific.
        autoDetectIpAddress: false,
        geolocationTracking: false,
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

export type Auth = ReturnType<typeof buildAuth>;

let cachedAuth: Auth | undefined;

export function createAuth(env: Env): Auth {
  cachedAuth ??= buildAuth(env);
  return cachedAuth;
}
