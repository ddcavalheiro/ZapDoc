import type { NextAuthConfig } from "next-auth";

/**
 * Configuração "edge-safe" (sem acesso a banco/bcrypt) usada pelo middleware.
 * O provider de credenciais fica em auth.ts (runtime Node).
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname === "/admin/login") return true;
      if (pathname.startsWith("/admin")) return !!auth?.user;
      return true;
    },
  },
} satisfies NextAuthConfig;
