/**
 * MatchLens AI - Next.js Authentication Middleware
 * 
 * Intercepts page requests to protect authenticated recruiter workspaces.
 * Redirects unauthenticated page requests to /login.
 * API routes handle their own JSON authentication responses.
 */

import { edgeAuth } from "@/lib/auth/edge";
import { NextResponse } from "next/server";

export default edgeAuth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isProtectedPath =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/jobs") ||
    nextUrl.pathname.startsWith("/settings");

  // If user is already logged in and navigates to /login or /register, redirect to /dashboard
  if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  // If accessing a protected route without being authenticated, redirect to /login
  if (isProtectedPath && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled directly with JSON 401/403/404)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
