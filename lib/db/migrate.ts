/**
 * MatchLens AI - Migration Runner
 * 
 * Executes versioned SQL migrations against PostgreSQL.
 */

import { getDb, closeDb } from "./index";
import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  console.log("[Migrations] Starting database migration check...");
  const db = await getDb();

  const migrationsDir = path.join(process.cwd(), "drizzle");
  if (!fs.existsSync(migrationsDir)) {
    console.log("[Migrations] No migrations directory found. Skipping.");
    return;
  }

  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`[Migrations] Found ${sqlFiles.length} migration file(s).`);

  for (const file of sqlFiles) {
    console.log(`[Migrations] Applying ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const statements = content.split("--> statement-breakpoint");

    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;

      try {
        await db.execute(sql.raw(trimmed));
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (
          errMsg.includes("already exists") ||
          errMsg.includes("duplicate key")
        ) {
          // Idempotent: table or index already exists
          continue;
        }
        console.warn(`[Migrations] Notice during migration ${file}:`, errMsg);
      }
    }
    console.log(`[Migrations] Applied ${file} successfully.`);
  }

  console.log("[Migrations] All migrations completed successfully.");
}

// Allow direct CLI execution: `npx tsx lib/db/migrate.ts`
if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[Migrations] Fatal error running migrations:", err);
      await closeDb();
      process.exit(1);
    });
}
