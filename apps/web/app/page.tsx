import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const features = [
  {
    icon: "📦",
    title: "Product Catalog",
    desc: "Manage SKUs, pricing, and product lifecycle with full CRUD operations.",
  },
  {
    icon: "🏭",
    title: "Warehouse & Branch",
    desc: "Multi-location inventory: one central warehouse, multiple branches.",
  },
  {
    icon: "🔄",
    title: "Stock Operations",
    desc: "Purchase, transfer, sale, and adjustments — all tracked in an append-only ledger.",
  },
  {
    icon: "📊",
    title: "Real-Time Dashboard",
    desc: "Instant visibility into stock levels, low-stock alerts, and recent movements.",
  },
  {
    icon: "🔮",
    title: "Demand Forecasting",
    desc: "Simple Exponential Smoothing for better replenishment planning.",
  },
  {
    icon: "⚡",
    title: "Budget Optimizer",
    desc: "Knapsack-based optimization to find the best product mix under budget.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen hero-gradient">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative py-24 px-4">
        <div className="max-w-5xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Production-Grade Inventory Management
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Manage inventory
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              with precision
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Warehouse-to-branch workflows, real-time stock tracking, demand
            forecasting, and budget optimization — all in one platform.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="btn btn-primary px-8 py-3 text-base">
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link href="/dashboard" className="btn btn-secondary px-8 py-3 text-base">
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-indigo-400 mb-3">
            Features
          </h2>
          <p className="text-center text-2xl font-bold text-white mb-14">
            Everything you need to run inventory
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass-card glass-card-hover p-6 space-y-3 transition-all duration-300 hover:translate-y-[-2px]"
              >
                <span className="text-2xl">{f.icon}</span>
                <h3 className="text-base font-semibold text-slate-100">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-500">
          <span>© 2026 IMS Platform. All rights reserved.</span>
          <span>Built with Next.js + Fastify + Prisma</span>
        </div>
      </footer>
    </div>
  );
}
