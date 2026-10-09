/**
 * MatchLens AI - Edge-compatible Auth configuration for Next.js Middleware
 * 
 * Contains NO database or Node.js native dependencies.
 * Uses Web Crypto for JWT verification in Edge Runtime.
 */

import NextAuth from "next-auth";

export const { auth: edgeAuth } = NextAuth({
  secret: process.env.AUTH_SECRET || "matchlens-dev-secret-key-32-chars-long-minimum-secure",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
});
