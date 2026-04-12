import { SiteHeader } from "@/components/site-header";
import { isPublicRegistrationOpen } from "@/lib/registration";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const showRegister = isPublicRegistrationOpen();

  return (
    <div className="min-h-screen hero-gradient">
      <SiteHeader />
      <div className="flex items-center justify-center px-4 pt-20 pb-16">
        <div className="w-full max-w-md animate-fade-in-scale">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                I
              </div>
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="mt-2 text-sm text-slate-400">
                Sign in to your IMS account
              </p>
            </div>
            <LoginForm showRegister={showRegister} />
          </div>
        </div>
      </div>
    </div>
  );
}
