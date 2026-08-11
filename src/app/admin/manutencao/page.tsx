import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWipeableCounts } from "@/db/queries";
import { ADMIN_ROLE } from "@/lib/action-utils";
import { WipeDataForm } from "@/components/wipe-data-form";

export const dynamic = "force-dynamic";

export default async function ManutencaoPage() {
  const session = await auth();
  // `notFound` em vez de 403: não revela a existência da tela para quem não
  // é ADMIN. A server action valida o perfil de novo, por conta própria.
  if (session?.user?.role !== ADMIN_ROLE) notFound();

  const counts = await getWipeableCounts();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-ink">Manutenção</h1>
      <p className="mb-5 text-sm text-ink-muted">
        Operações destrutivas, restritas ao perfil {ADMIN_ROLE}.
      </p>
      <WipeDataForm counts={counts} />
    </div>
  );
}
