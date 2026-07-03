import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ClientTable } from "@/components/ClientTable";
import {
  getClientsNeedingFollowUp,
  SAMPLE_CLIENTS,
} from "@/lib/clients";
import { getSession } from "@/lib/auth";

export default async function ClientsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const overdue = getClientsNeedingFollowUp(SAMPLE_CLIENTS);

  return (
    <div className="min-h-full bg-zinc-50">
      <AppHeader user={session} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <section>
          <h2 className="text-2xl font-semibold text-zinc-900">Clients</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Track status and upcoming follow-ups for your freelance pipeline.
          </p>
        </section>

        {overdue.length > 0 ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-medium text-rose-800">
              {overdue.length} client{overdue.length === 1 ? "" : "s"} need
              follow-up
            </p>
            <p className="mt-0.5 text-sm text-rose-700">
              {overdue.map((client) => client.name).join(", ")}
            </p>
          </section>
        ) : null}

        <ClientTable clients={SAMPLE_CLIENTS} />
      </main>
    </div>
  );
}
