/**
 * MatchLens AI - Liveness Probe (/api/healthz)
 * 
 * Verifies that the Next.js application server process is running, responsive,
 * and able to handle incoming HTTP requests.
 * 
 * Strict Guarantees:
 * - Ultra-lightweight (< 5ms response time).
 * - No heavy database queries or scans.
 * - Never returns environment variables, credentials, or internal topology.
 */

import { NextResponse } from "next/server";
import { extractOrGenerateRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { requestId } = extractOrGenerateRequestId(request);

  return NextResponse.json(
    {
      status: "ok",
      service: "matchlens-ai",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "x-request-id": requestId,
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
