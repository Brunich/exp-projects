import Link from "next/link";
import type { SessionUser } from "@/lib/types";

interface AppHeaderProps {
  user: SessionUser;
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Client Tracker
          </p>
          <h1 className="text-lg font-semibold text-zinc-900">
            Freelancer CRM
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-sm text-zinc-600 sm:block">{user.name}</p>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function LoginHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <Link href="/" className="inline-block">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Client Tracker
          </p>
          <h1 className="text-lg font-semibold text-zinc-900">
            Freelancer CRM
          </h1>
        </Link>
      </div>
    </header>
  );
}
