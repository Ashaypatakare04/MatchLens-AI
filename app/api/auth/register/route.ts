import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { extractOrGenerateRequestId, logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const { requestId } = extractOrGenerateRequestId(req);
  try {
    const body = await req.json();
    const { organizationName, name, email, password } = body || {};

    if (!organizationName || typeof organizationName !== "string" || organizationName.trim().length < 2) {
      return NextResponse.json(
        { error: "Organization name must be at least 2 characters long." },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Full name must be at least 2 characters long." },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required." },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateCheck = checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000); // 5 per 15 min
    if (!rateCheck.allowed) {
      logger.warn("Registration rate limit exceeded", {
        event: "auth.register_rate_limited",
        requestId,
        component: "auth",
        statusCode: 429,
      });
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "x-request-id": requestId } }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = await getDb();

    // Check existing user - uniform error response prevents email enumeration
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existingUser) {
      logger.warn("Registration attempt rejected: email already registered", {
        event: "auth.register_duplicate_attempt",
        requestId,
        component: "auth",
        statusCode: 400,
      });
      return NextResponse.json(
        { error: "Unable to complete registration with the provided details. If you already have an account, please sign in." },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    // Generate organization slug
    let baseSlug = organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!baseSlug) baseSlug = "org";

    const randomSuffix = crypto.randomBytes(3).toString("hex");
    const orgSlug = `${baseSlug}-${randomSuffix}`;
    const orgId = `org-${crypto.randomBytes(6).toString("hex")}`;
    const userId = `user-${crypto.randomBytes(6).toString("hex")}`;

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date();

    // Create organization and initial admin user atomically
    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({
        id: orgId,
        name: organizationName.trim(),
        slug: orgSlug,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(users).values({
        id: userId,
        organizationId: orgId,
        email: cleanEmail,
        name: name.trim(),
        passwordHash,
        role: "ADMIN",
        createdAt: now,
        updatedAt: now,
      });
    });

    logger.info("Organization and admin registered successfully", {
      event: "auth.org_registered",
      requestId,
      component: "auth",
      orgId,
      userId,
      statusCode: 201,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Organization and admin user created successfully.",
        organization: { id: orgId, name: organizationName.trim(), slug: orgSlug },
        user: { id: userId, email: cleanEmail, name: name.trim(), role: "ADMIN" },
      },
      { status: 201, headers: { "x-request-id": requestId } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Error during registration", {
      event: "auth.register_error",
      requestId,
      component: "auth",
      statusCode: 500,
    }, err);
    return NextResponse.json(
      { error: "Failed to register organization: " + message },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
