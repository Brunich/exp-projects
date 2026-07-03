interface LoginFormProps {
  error?: string;
  next?: string;
}

export function LoginForm({ error, next }: LoginFormProps) {
  return (
    <form
      action="/api/auth/login"
      method="post"
      className="w-full max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Sign in</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Use the demo account to explore the client list.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue="demo@freelancer.dev"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          defaultValue="demo123"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        Continue
      </button>

      <p className="text-xs text-zinc-500">
        Demo credentials: <code>demo@freelancer.dev</code> / <code>demo123</code>
      </p>
    </form>
  );
}
