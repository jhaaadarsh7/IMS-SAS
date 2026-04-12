"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginFields({ showRegister }: { showRegister: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Sign in failed");
        return;
      }
      router.push(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" role="alert">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-dark"
            placeholder="admin@ims.local"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-1.5">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-dark"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary w-full py-3"
        >
          {pending ? (
            <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
      {showRegister ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Register
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account? Ask your administrator.
        </p>
      )}
    </>
  );
}

export function LoginForm({ showRegister }: { showRegister: boolean }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><span className="spinner" /></div>}>
      <LoginFields showRegister={showRegister} />
    </Suspense>
  );
}
