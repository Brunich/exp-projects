import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ClientsDashboard } from "@/components/ClientsDashboard";
import { getSession } from "@/lib/auth";

export default async function ClientsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-full bg-zinc-50">
      <AppHeader user={session} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ClientsDashboard />
      </main>
    </div>
  );
}
