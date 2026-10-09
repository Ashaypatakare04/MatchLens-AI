/**
 * MatchLens AI - Database Client Connection & Factory
 * 
 * Manages connections to PostgreSQL using Drizzle ORM.
 * In production or when DATABASE_URL is supplied: connects via node-postgres (pg.Pool).
 * In local development / test environments without an external database:
 * seamlessly uses embedded in-process PostgreSQL WASM (@electric-sql/pglite),
 * providing 100% native Postgres SQL dialect, constraints, and ACID transactions.
 */

import { drizzle as drizzlePg, NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite, PgliteDatabase } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

export type AppDatabase = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

let dbInstance: AppDatabase | null = null;
let pgliteInstance: PGlite | null = null;
let pgPoolInstance: Pool | null = null;

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function isRemotePostgresConfigured(): boolean {
  const url = getDatabaseUrl();
  return Boolean(
    url &&
    (url.startsWith("postgresql://") || url.startsWith("postgres://"))
  );
}

/**
 * Initializes and returns the Drizzle database client.
 */
export async function getDb(): Promise<AppDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = getDatabaseUrl();

  if (isRemotePostgresConfigured() && databaseUrl) {
    // Remote / local TCP PostgreSQL instance
    pgPoolInstance = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    dbInstance = drizzlePg(pgPoolInstance, { schema });
    return dbInstance;
  }

  // Embedded PostgreSQL WASM instance for local development / testing
  // Stores data in .data/pglite if persistent, or memory for ephemeral
  const pgliteDir = path.join(process.cwd(), ".data", "pglite");
  if (!fs.existsSync(pgliteDir)) {
    fs.mkdirSync(pgliteDir, { recursive: true });
  }

  pgliteInstance = new PGlite(pgliteDir);
  dbInstance = drizzlePglite(pgliteInstance, { schema });

  // Ensure tables and constraints exist in local database
  await ensureSchemaInitialized(pgliteInstance);

  return dbInstance;
}

/**
 * Executes initial SQL migration schema statements on PGlite if tables don't exist yet.
 */
async function ensureSchemaInitialized(pglite: PGlite) {
  try {
    const migrationFile = path.join(process.cwd(), "drizzle", "0000_gifted_omega_red.sql");
    if (fs.existsSync(migrationFile)) {
      const sqlContent = fs.readFileSync(migrationFile, "utf-8");
      // Split on statement-breakpoint
      const statements = sqlContent.split("--> statement-breakpoint");
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
          try {
            await pglite.query(trimmed);
          } catch (err: unknown) {
            // Ignore already exists errors
            const errMsg = err instanceof Error ? err.message : String(err);
            if (!errMsg.includes("already exists")) {
              console.warn("Schema initialization statement warning:", errMsg);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to initialize PGlite schema:", err);
  }
}

/**
 * Closes the active database connection (used for teardown in test suites).
 */
export async function closeDb(): Promise<void> {
  if (pgPoolInstance) {
    await pgPoolInstance.end();
    pgPoolInstance = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  dbInstance = null;
}
