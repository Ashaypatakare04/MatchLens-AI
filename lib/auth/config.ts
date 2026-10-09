/**
 * MatchLens AI - NextAuth / Auth.js Configuration
 * 
 * Provides session management, credentials authentication,
 * and organization-scoped JWT claims.
 */

import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "../db";
import { users, organizations } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import "./types";

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET || "matchlens-dev-secret-key-32-chars-long-minimum-secure",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        try {
          const db = await getDb();
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user || !user.passwordHash) {
            return null;
          }

          const isValid = bcrypt.compareSync(password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          // Fetch user's organization
          const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, user.organizationId))
            .limit(1);

          if (!org) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as "ADMIN" | "RECRUITER" | "VIEWER",
            organizationId: user.organizationId,
            organizationName: org.name,
            organizationSlug: org.slug,
          };
        } catch (err) {
          console.error("[Auth] Error authorizing user credentials:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.organizationSlug = user.organizationSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
        session.user.organizationSlug = token.organizationSlug;
      }
      return session;
    },
  },
};
