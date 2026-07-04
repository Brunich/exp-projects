import Link from "next/link";
import { QuoteBuilder } from "@/components/QuoteBuilder";

interface EditQuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const { id } = await params;

  return (
    <div className="min-h-full">
      <header className="border-b border-zinc-200 bg-white no-print">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
              ← Home
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-zinc-900">
              Edit quote
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <QuoteBuilder savedQuoteId={id} />
      </main>
    </div>
  );
}
