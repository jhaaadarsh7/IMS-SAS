import Link from "next/link";
import { ShieldAlert } from "lucide-react";

interface AccessDeniedProps {
  reason?: string;
  action?: string;
}

export function AccessDenied({ reason, action = "access this feature" }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in px-4">
      {/* Premium Glowing Lock Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-sm shadow-2xl">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-500"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="url(#lock-gradient)" stroke="none" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" className="stroke-amber-400" />
            <circle cx="12" cy="16" r="1.5" fill="rgba(0,0,0,0.3)" stroke="none" />
            <defs>
              <linearGradient id="lock-gradient" x1="3" y1="11" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f59e0b" />
                <stop offset="1" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-white tracking-tight mb-4">
        Access Denied
      </h1>
      
      <p className="max-w-md text-slate-400 text-lg leading-relaxed mb-10">
        {reason || `Your role does not include permission to ${action}.`}
      </p>

      <Link 
        href="/dashboard" 
        className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 shadow-lg backdrop-blur-md"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
