import Link from "next/link";
import { QuoteBuilder } from "@/components/QuoteBuilder";

export default function NewQuotePage() {
  return (
    <div className="min-h-full">
      <header className="border-b border-zinc-200 bg-white no-print">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
              ← Home
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-zinc-900">New quote</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <QuoteBuilder />
      </main>
    </div>
  );
}
