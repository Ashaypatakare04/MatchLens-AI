import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, handleAuthError } from "@/lib/auth/session";
import { executeRetentionPrune } from "@/lib/storage/retention";

/**
 * POST /api/admin/retention
 * 
 * Enforces ADMIN role authorization or authorized cron service token (MONITORING_API_KEY / CRON_SECRET)
 * and triggers an automated retention pruning sweep.
 */
export async function POST(req: NextRequest) {
  try {
    const monitoringApiKey = process.env.MONITORING_API_KEY;
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    let isAuthorized = false;

    if (
      (monitoringApiKey && authHeader === `Bearer ${monitoringApiKey}`) ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`)
    ) {
      isAuthorized = true;
    } else {
      const user = await getSessionUser(req);
      if (user && user.role === "ADMIN") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: Admin or authorized service credentials required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? body.limit : 100;

    const result = await executeRetentionPrune(limit);

    return NextResponse.json({
      status: "success",
      ...result,
      executedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
