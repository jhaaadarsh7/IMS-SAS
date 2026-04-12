import { type ReactNode } from "react";

export type BadgeVariant = "indigo" | "emerald" | "amber" | "rose" | "sky" | "slate";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "slate", className = "" }: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    indigo: "badge-indigo",
    emerald: "badge-emerald",
    amber: "badge-amber",
    rose: "badge-rose",
    sky: "badge-sky",
    slate: "badge-slate",
  };

  return (
    <span className={`badge ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
