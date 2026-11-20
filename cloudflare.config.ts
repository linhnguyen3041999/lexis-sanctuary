import { bindings, defineConfig } from "cf/config";

const localDatabaseId = "00000000-0000-4000-8000-000000000001";

export default defineConfig({
  worker: {
    name: "lexis-sanctuary",
    compatibilityDate: "2026-11-19",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "./worker/index.ts",
    workersDev: true,
    previewUrls: true,
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
    env: {
      DB: bindings.d1({
        name: "lexis-sanctuary",
        id: process.env.CLOUDFLARE_D1_DATABASE_ID ?? localDatabaseId,
      }),
      BETTER_AUTH_URL: bindings.text(process.env.BETTER_AUTH_URL ?? "http://localhost:5173"),
      BETTER_AUTH_SECRET: bindings.secret(),
      GOOGLE_CLIENT_ID: bindings.secret(),
      GOOGLE_CLIENT_SECRET: bindings.secret(),
      GEMINI_API_KEY: bindings.secret(),
    },
    observability: {
      enabled: true,
      redactQueryString: true,
      logs: {
        enabled: true,
        invocationLogs: true,
        persist: true,
      },
      traces: {
        enabled: true,
        persist: true,
      },
    },
  },
});
