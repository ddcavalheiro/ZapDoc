import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16: "Middleware" passou a se chamar Proxy (convenção proxy.ts).
// Com diretório `src/`, o arquivo fica em `src/` (mesmo nível de `app/`).
// O Next exige um export de função (default ou nomeado `proxy`), então
// expomos a função `auth` do next-auth diretamente — destructuring no export
// não é reconhecido como função pelo bundler.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/admin/:path*"],
};
