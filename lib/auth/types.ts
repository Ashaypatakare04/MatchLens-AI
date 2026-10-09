import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: "ADMIN" | "RECRUITER" | "VIEWER";
    organizationId?: string;
    organizationName?: string;
    organizationSlug?: string;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: "ADMIN" | "RECRUITER" | "VIEWER";
      organizationId?: string;
      organizationName?: string;
      organizationSlug?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "RECRUITER" | "VIEWER";
    organizationId?: string;
    organizationName?: string;
    organizationSlug?: string;
  }
}
