import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Sem sessão (ex.: página de login): renderiza sem o shell.
  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <AdminShell
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </AdminShell>
  );
}
