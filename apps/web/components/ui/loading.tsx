export function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizes = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
  };

  return (
    <div className={`spinner ${sizes[size]} ${className}`} />
  );
}

export function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 animate-fade-in-scale">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm font-medium text-slate-400 animate-pulse">Loading data...</p>
    </div>
  );
}
