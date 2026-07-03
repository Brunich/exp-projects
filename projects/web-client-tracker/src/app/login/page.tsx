import { LoginForm } from "@/components/LoginForm";
import { LoginHeader } from "@/components/AppHeader";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error =
    params.error === "invalid" ? "Invalid email or password." : undefined;

  return (
    <div className="min-h-full bg-zinc-50">
      <LoginHeader />
      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-12 sm:px-6">
        <LoginForm error={error} next={params.next} />
      </main>
    </div>
  );
}
