interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon = "🔍", action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in-scale">
      <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-4xl mb-6 shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      {description && <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
