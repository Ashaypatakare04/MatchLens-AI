/**
 * MatchLens AI - Readiness Probe (/api/readyz)
 * 
 * Verifies that all required backing services (PostgreSQL database, object storage)
 * are reachable and capable of processing traffic.
 * 
 * Strict Guarantees:
 * - Bounded dependency timeout (2000ms max per probe).
 * - Returns HTTP 200 when ready, HTTP 503 when degraded.
 * - Never leaks database connection strings, credentials, or internal stack traces.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getObjectStorageService } from "@/lib/storage/object-storage";
import { extractOrGenerateRequestId, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface DependencyCheck {
  status: "healthy" | "unhealthy";
  latencyMs: number;
  message?: string;
}

/**
 * Checks PostgreSQL connectivity with a strict bounded timeout.
 */
async function checkDatabase(timeoutMs = 2000): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database check timed out")), timeoutMs)
    );

    const checkPromise = (async () => {
      const db = await getDb();
      await db.execute(sql`SELECT 1`);
      return true;
    })();

    await Promise.race([checkPromise, timeoutPromise]);
    return {
      status: "healthy",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database connection failed";
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: msg.includes("timed out") ? "Database connection timeout" : "Database unreachable",
    };
  }
}

/**
 * Checks Object Storage service availability with a bounded timeout.
 */
async function checkStorage(timeoutMs = 2000): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Storage check timed out")), timeoutMs)
    );

    const checkPromise = (async () => {
      const storage = getObjectStorageService();
      // Test storage existence check on a non-existent probe key
      await storage.objectExists("probes/readiness.txt", "system-probe");
      return true;
    })();

    await Promise.race([checkPromise, timeoutPromise]);
    return {
      status: "healthy",
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: "Storage service check failed",
    };
  }
}

export async function GET(request: Request) {
  const { requestId } = extractOrGenerateRequestId(request);
  const start = Date.now();

  const [dbCheck, storageCheck] = await Promise.all([
    checkDatabase(2000),
    checkStorage(2000),
  ]);

  const isReady = dbCheck.status === "healthy" && storageCheck.status === "healthy";
  const durationMs = Date.now() - start;

  if (!isReady) {
    logger.warn("Readiness probe reported degraded dependency", {
      event: "health.readiness_failed",
      requestId,
      durationMs,
      dbStatus: dbCheck.status,
      storageStatus: storageCheck.status,
    });
  }

  const responsePayload = {
    status: isReady ? "ready" : "unhealthy",
    timestamp: new Date().toISOString(),
    durationMs,
    checks: {
      database: dbCheck.status,
      storage: storageCheck.status,
    },
    ...(!isReady && {
      details: {
        database: dbCheck.message,
        storage: storageCheck.message,
      },
    }),
  };

  return NextResponse.json(responsePayload, {
    status: isReady ? 200 : 503,
    headers: {
      "x-request-id": requestId,
      "cache-control": "no-store, no-cache, must-revalidate",
    },
  });
}
