import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles } from "@/db/schema";
import { decryptSecret, verifyTotp } from "@/lib/mfa";
import { authConfig } from "./auth.config";

/** Senha correta, mas o usuário ativo precisa informar o código do autenticador. */
export class MfaRequiredError extends CredentialsSignin {
  code = "mfa_required";
}
/** Código TOTP informado é inválido. */
export class InvalidTotpError extends CredentialsSignin {
  code = "invalid_totp";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        totp: { label: "Código", type: "text" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(creds?.password ?? "");
        const totp = String(creds?.totp ?? "").trim();
        if (!email || !password) return null;

        const row = (
          await db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
              passwordHash: users.passwordHash,
              active: users.active,
              mfaEnabled: users.mfaEnabled,
              mustChangePassword: users.mustChangePassword,
              totpSecret: users.totpSecret,
              role: roles.name,
            })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id))
            .where(eq(users.email, email))
            .limit(1)
        )[0];
        if (!row) return null;

        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return null;
        if (!row.active) return null;

        // Usuário ativo com MFA configurado: exige o código TOTP.
        if (row.mfaEnabled) {
          if (!totp) throw new MfaRequiredError();
          if (!row.totpSecret) throw new InvalidTotpError();
          const valid = verifyTotp(decryptSecret(row.totpSecret), totp);
          if (!valid) throw new InvalidTotpError();
        }
        // Onboarding incompleto: entra só com a senha; o middleware força o setup.

        return {
          id: String(row.id),
          email: row.email,
          name: row.name,
          role: row.role ?? "",
          mfaEnabled: row.mfaEnabled,
          mustChangePassword: row.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = String(user.id);
        token.role = user.role ?? "";
        token.mfaEnabled = Boolean(user.mfaEnabled);
        token.mustChangePassword = Boolean(user.mustChangePassword);
      } else if (trigger === "update" && token.id) {
        // Após cada passo do onboarding, relê o estado atual e refresca os claims.
        const fresh = (
          await db
            .select({
              mfaEnabled: users.mfaEnabled,
              mustChangePassword: users.mustChangePassword,
            })
            .from(users)
            .where(eq(users.id, Number(token.id)))
            .limit(1)
        )[0];
        if (fresh) {
          token.mfaEnabled = fresh.mfaEnabled;
          token.mustChangePassword = fresh.mustChangePassword;
        }
      }
      return token;
    },
  },
});
