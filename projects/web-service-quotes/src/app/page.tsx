import Link from "next/link";
import { ExpiredQuotesBanner } from "@/components/ExpiredQuotesBanner";
import { SavedQuotesList } from "@/components/SavedQuotesList";

export default function Home() {
  return (
    <div className="min-h-full">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <p className="font-semibold text-zinc-900">Service Quote Builder</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/templates"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Templates
            </Link>
            <Link
              href="/quotes/new?fresh=1"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              New quote
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
            For local service providers
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900">
            Turn job templates into client-ready quotes
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            Pick a service template, adjust line items, and print a clean quote
            your client can approve. Built for cleaners, landscapers, plumbers,
            and other trades who quote on the go.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/quotes/new"
              className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Start a quote
            </Link>
          </div>
        </div>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Templates",
              body: "Pre-built line items for common jobs so you quote faster.",
            },
            {
              title: "Live totals",
              body: "Tax and totals update as you edit quantities and prices.",
            },
            {
              title: "Print ready",
              body: "One-click print layout you can save as PDF and send.",
            },
            {
              title: "Saved locally",
              body: "Drafts auto-save in your browser and saved quotes stay on this device.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-zinc-900">{item.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{item.body}</p>
            </article>
          ))}
        </section>

        <ExpiredQuotesBanner />
        <SavedQuotesList />
      </main>
    </div>
  );
}
