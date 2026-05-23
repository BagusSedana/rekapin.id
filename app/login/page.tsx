import Link from "next/link";
import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

function getErrorMessage(error?: string) {
  if (error === "auth_failed") {
    return "Link masuk tidak valid atau sudah kedaluwarsa. Minta link baru ya.";
  }

  return null;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const initialError = getErrorMessage(searchParams?.error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Link href="/" className="text-base font-bold text-emerald-700">
          Rekapin.id
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Masuk</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Kami akan kirim link masuk ke email kamu. Tidak perlu password.
        </p>
        <div className="mt-5">
          <LoginForm initialError={initialError} />
        </div>
      </div>
    </main>
  );
}
