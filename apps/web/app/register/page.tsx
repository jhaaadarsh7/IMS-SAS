import { SiteHeader } from "@/components/site-header";
import { isPublicRegistrationOpen } from "@/lib/registration";
import { RegisterForm } from "./register-form";
import Link from "next/link";

export default function RegisterPage() {
  const open = isPublicRegistrationOpen();

  if (!open) {
    return (
      <div className="min-h-screen hero-gradient">
        <SiteHeader />
        <div className="flex items-center justify-center px-4 pt-20 pb-16">
          <div className="text-center animate-fade-in">
            <p className="text-4xl mb-4">🔒</p>
            <h1 className="text-xl font-bold text-white">Registration Disabled</h1>
            <p className="mt-3 text-slate-400 max-w-md">
              Public registration is currently disabled. Please contact an administrator to create your account.
            </p>
            <Link href="/login" className="btn btn-primary mt-6 inline-flex">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient">
      <SiteHeader />
      <div className="flex items-center justify-center px-4 pt-16 pb-16">
        <div className="w-full max-w-md animate-fade-in-scale">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                I
              </div>
              <h1 className="text-2xl font-bold text-white">Create Account</h1>
              <p className="mt-2 text-sm text-slate-400">Register for the IMS platform</p>
            </div>
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}
