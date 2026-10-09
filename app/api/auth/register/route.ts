import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationName, name, email, password } = body || {};

    if (!organizationName || typeof organizationName !== "string" || organizationName.trim().length < 2) {
      return NextResponse.json(
        { error: "Organization name must be at least 2 characters long." },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Full name must be at least 2 characters long." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = await getDb();

    // Check existing user
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 409 }
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

    return NextResponse.json(
      {
        success: true,
        message: "Organization and admin user created successfully.",
        organization: { id: orgId, name: organizationName.trim(), slug: orgSlug },
        user: { id: userId, email: cleanEmail, name: name.trim(), role: "ADMIN" },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[Register] Error during registration:", err);
    return NextResponse.json(
      { error: "Failed to register organization: " + message },
      { status: 500 }
    );
  }
}
