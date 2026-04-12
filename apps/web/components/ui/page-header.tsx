import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">{title}</h1>
        {description && <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
