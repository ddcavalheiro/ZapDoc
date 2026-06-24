import type { NextAuthConfig } from "next-auth";

/**
 * Configuração "edge-safe" (sem acesso a banco/bcrypt) usada pelo middleware.
 * O provider de credenciais e o callback `jwt` (que lê o banco) ficam em
 * auth.ts (runtime Node). Aqui só lidamos com os claims já presentes no token.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Expõe os claims do token na sessão (puro, sem banco → seguro no edge).
    session({ session, token }) {
      if (token && session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        session.user.role = typeof token.role === "string" ? token.role : "";
        session.user.mfaEnabled = Boolean(token.mfaEnabled);
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname === "/admin/login") return true;
      if (!pathname.startsWith("/admin")) return true;

      const user = auth?.user;
      if (!user) return false; // redireciona para a página de login

      // Só interferimos em navegações GET. Redirecionar um POST de server action
      // faz o cliente receber um redirect no lugar da resposta da action e
      // estourar "An unexpected response was received from the server". As páginas
      // e actions já validam a sessão por conta própria.
      if (request.method !== "GET") return true;

      // Onboarding incompleto: precisa trocar senha temporária ou configurar MFA.
      const onboardingPending = user.mustChangePassword || !user.mfaEnabled;
      const onOnboarding = pathname === "/admin/onboarding";

      if (onboardingPending && !onOnboarding) {
        return Response.redirect(new URL("/admin/onboarding", request.nextUrl));
      }
      if (!onboardingPending && onOnboarding) {
        return Response.redirect(new URL("/admin", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
