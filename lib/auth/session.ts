/**
 * MatchLens AI - Centralized Server-Side Authorization Layer
 * 
 * Provides trusted session validation, organization membership derivation,
 * and role-based access control.
 * 
 * Guarantees:
 * 1. Derives organization scope solely from authenticated server identity.
 * 2. Never trusts client-supplied organization IDs or roles.
 * 3. Returns non-disclosing safe error responses preventing cross-tenant information leaks.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "./index";
import { getDb } from "../db";
import { users, organizations } from "../db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export type UserRole = "ADMIN" | "RECRUITER" | "VIEWER";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
  organizationSlug?: string;
}

export class AuthError extends Error {
  public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND";
  public readonly status: number;

  constructor(
    code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND",
    message: string
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 404;
  }
}

const AUTH_SECRET = process.env.AUTH_SECRET || "matchlens-dev-secret-key-32-chars-long-minimum-secure";

/**
 * Creates a cryptographically signed test authorization token for test suites.
 */
export function createTestAuthToken(payload: { userId: string }): string {
  const data = JSON.stringify({ userId: payload.userId, ts: Date.now() });
  const b64Data = Buffer.from(data).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(b64Data)
    .digest("base64url");
  return `${b64Data}.${signature}`;
}

/**
 * Verifies a signed test authorization token and returns the verified userId.
 */
export function verifyTestAuthToken(token: string): string | null {
  try {
    const [b64Data, signature] = token.split(".");
    if (!b64Data || !signature) return null;

    const expectedSig = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(b64Data)
      .digest("base64url");

    if (signature !== expectedSig) return null;

    const json = JSON.parse(Buffer.from(b64Data, "base64url").toString("utf-8"));
    return json.userId || null;
  } catch {
    return null;
  }
}

/**
 * Resolves the authenticated user from NextAuth session or verified authorization token.
 * Validates membership against the database to guarantee fresh, trusted permissions.
 */
export async function getSessionUser(
  req?: NextRequest | Request
): Promise<AuthenticatedUser | null> {
  let userId: string | null = null;

  // 1. Check Authorization Bearer header for signed test token or API token
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      userId = verifyTestAuthToken(token);
    }
  }

  // 2. Check NextAuth server session
  if (!userId) {
    try {
      const session = await auth();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      // In standalone script / test contexts without Next.js headers()
      userId = null;
    }
  }

  if (!userId) {
    return null;
  }

  // 3. Resolve user and organization directly from database
  try {
    const db = await getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    if (!org) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      organizationId: user.organizationId,
      organizationName: org.name,
      organizationSlug: org.slug,
    };
  } catch (err) {
    console.error("[Auth] Database resolution error for user:", err);
    return null;
  }
}

/**
 * Enforces that the request comes from an authenticated user.
 * Throws AuthError(401) if unauthenticated.
 */
export async function requireAuthenticatedUser(
  req?: NextRequest | Request
): Promise<AuthenticatedUser> {
  const user = await getSessionUser(req);
  if (!user) {
    throw new AuthError(
      "UNAUTHENTICATED",
      "Authentication required. Please sign in to access this resource."
    );
  }
  return user;
}

/**
 * Enforces that the user belongs to an organization and optionally matches an expected organization.
 * Throws AuthError(401) or AuthError(404 - non-disclosing) if unauthorized.
 */
export async function requireOrganizationMembership(
  req?: NextRequest | Request,
  expectedOrgId?: string
): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser(req);

  if (expectedOrgId && user.organizationId !== expectedOrgId) {
    // Non-disclosing not-found: do not reveal that another tenant's resource exists
    throw new AuthError(
      "NOT_FOUND",
      "Resource not found."
    );
  }

  return user;
}

/**
 * Enforces role-based permissions (e.g. ADMIN required for sensitive settings).
 * Throws AuthError(403) if role is insufficient.
 */
export async function requireOrganizationRole(
  req: NextRequest | Request | undefined,
  allowedRoles: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser(req);

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      "FORBIDDEN",
      `Insufficient permissions. Requires one of: [${allowedRoles.join(", ")}].`
    );
  }

  return user;
}

/**
 * Formats standard, safe HTTP error responses for authentication/authorization failures.
 */
export function handleAuthError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status }
    );
  }

  const message = err instanceof Error ? err.message : String(err);
  console.error("[Auth Error Handler] Unexpected error:", err);
  return NextResponse.json(
    { error: message || "An unexpected error occurred." },
    { status: 500 }
  );
}
