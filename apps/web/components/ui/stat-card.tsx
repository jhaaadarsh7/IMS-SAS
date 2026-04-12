interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
}

export function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  return (
    <div className="glass-card p-5 flex items-start gap-4 animate-fade-in group hover:translate-y-[-2px] transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
          {trend && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend.isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {trend.isUp ? '↑' : '↓'} {trend.value}%
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
