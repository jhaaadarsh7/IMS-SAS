"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { USER_ROLES } from "@/lib/auth/roles";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("STAFF");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Registration failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" role="alert">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="reg-name" className="block text-sm font-medium text-slate-300 mb-1">Name</label>
          <input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} required className="input-dark" placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-dark" placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
          <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input-dark" placeholder="Min 6 characters" />
        </div>
        <div>
          <label htmlFor="reg-role" className="block text-sm font-medium text-slate-300 mb-1">Role</label>
          <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value)} className="input-dark">
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary w-full py-3">
          {pending ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating account...</> : "Create Account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Sign in</Link>
      </p>
    </>
  );
}
