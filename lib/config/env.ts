/**
 * MatchLens AI - Environment Variable Configuration & Assertion
 * Validates and provides type-safe access to runtime environment variables.
 */

export interface AppConfig {
  databaseUrl?: string;
  isPostgresConfigured: boolean;
  geminiApiKey?: string;
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
}

export function validateEnvironment(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV as "development" | "production" | "test") || "development";
  const databaseUrl = process.env.DATABASE_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  const isPostgresConfigured = Boolean(
    databaseUrl &&
    (databaseUrl.startsWith("postgresql://") ||
      databaseUrl.startsWith("postgres://"))
  );

  // In production, DATABASE_URL must be provided
  if (nodeEnv === "production" && !isPostgresConfigured) {
    console.warn(
      "[Config Alert] DATABASE_URL is not set or invalid in production environment. A PostgreSQL connection is required for persistent multi-tenant operations."
    );
  }

  return {
    databaseUrl,
    isPostgresConfigured,
    geminiApiKey,
    nodeEnv,
    isProduction: nodeEnv === "production",
  };
}

export const env = validateEnvironment();
