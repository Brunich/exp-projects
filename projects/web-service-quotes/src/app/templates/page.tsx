import Link from "next/link";
import { CustomTemplatesManager } from "@/components/CustomTemplatesManager";

export default function TemplatesPage() {
  return (
    <div className="min-h-full">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-semibold text-zinc-900 hover:text-indigo-700">
            Service Quote Builder
          </Link>
          <Link
            href="/quotes/new?fresh=1"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            New quote
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <CustomTemplatesManager />
      </main>
    </div>
  );
}
