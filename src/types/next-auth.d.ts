import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      mfaEnabled: boolean;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  /** Campos extras devolvidos por authorize() em auth.ts. */
  interface User {
    role?: string;
    mfaEnabled?: boolean;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    mfaEnabled?: boolean;
    mustChangePassword?: boolean;
  }
}
