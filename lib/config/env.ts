/**
 * MatchLens AI - Environment Variable Configuration & Assertion
 * Validates and provides type-safe access to runtime environment variables.
 */

export interface AppConfig {
  databaseUrl?: string;
  isPostgresConfigured: boolean;
  geminiApiKey?: string;
  authSecret?: string;
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
}

export function validateEnvironment(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV as "development" | "production" | "test") || "development";
  const databaseUrl = process.env.DATABASE_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const authSecret = process.env.AUTH_SECRET;

  const isPostgresConfigured = Boolean(
    databaseUrl &&
    (databaseUrl.startsWith("postgresql://") ||
      databaseUrl.startsWith("postgres://"))
  );

  // In production, DATABASE_URL and AUTH_SECRET must be provided
  if (nodeEnv === "production") {
    if (!isPostgresConfigured) {
      console.warn(
        "[Config Alert] DATABASE_URL is not set or invalid in production environment. A PostgreSQL connection is required for persistent multi-tenant operations."
      );
    }
    if (!authSecret) {
      console.warn(
        "[Config Alert] AUTH_SECRET is not set in production. Set a random 32+ character secret to ensure JWT and session tamper-proofing."
      );
    }
  }

  return {
    databaseUrl,
    isPostgresConfigured,
    geminiApiKey,
    authSecret,
    nodeEnv,
    isProduction: nodeEnv === "production",
  };
}

export const env = validateEnvironment();
