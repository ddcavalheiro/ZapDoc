import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { OnboardingFlow } from "@/components/onboarding-flow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  // Estado FRESCO do banco (não os claims do token, que ficam defasados durante
  // o onboarding até o usuário relogar).
  const user = (
    await db
      .select({
        mustChangePassword: users.mustChangePassword,
        mfaEnabled: users.mfaEnabled,
      })
      .from(users)
      .where(eq(users.id, Number(session.user.id)))
      .limit(1)
  )[0];
  if (!user) redirect("/admin/login");

  const needsPassword = user.mustChangePassword;
  const needsMfa = !user.mfaEnabled;

  // Onboarding já concluído no banco: o token ainda está defasado, então
  // mandamos relogar (gera um token novo com os claims corretos).
  if (!needsPassword && !needsMfa) redirect("/admin/login");

  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-bold text-ink">
          Bem-vindo ao ZapDoc
        </h1>
        <p className="mb-6 text-sm text-ink-muted">
          Conclua a configuração da sua conta para continuar.
        </p>
        <OnboardingFlow needsPassword={needsPassword} needsMfa={needsMfa} />
      </div>
    </div>
  );
}
