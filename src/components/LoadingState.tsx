interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "skeleton" | "cards";
  rows?: number;
}

export default function LoadingState({
  message = "Loading...",
  size = "md",
  variant = "spinner",
  rows = 3,
}: LoadingStateProps) {
  if (variant === "cards") {
    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="card p-6 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 skeleton rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 skeleton w-3/4" />
                <div className="h-3 skeleton w-1/2" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 skeleton w-full" />
              <div className="h-4 skeleton w-5/6" />
            </div>
            <div className="flex gap-2 mb-4">
              <div className="h-6 skeleton w-16 rounded-full" />
              <div className="h-6 skeleton w-20 rounded-full" />
            </div>
            <div className="h-10 skeleton rounded-xl w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className="space-y-4 w-full">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="card p-5 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 skeleton rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 skeleton w-3/4" />
                <div className="h-3 skeleton w-1/2" />
              </div>
              <div className="h-6 skeleton w-16 rounded-full flex-shrink-0" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 skeleton w-full" />
              <div className="h-3 skeleton w-5/6" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-5 skeleton w-16 rounded-full" />
              <div className="h-5 skeleton w-20 rounded-full" />
              <div className="h-5 skeleton w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const sizeClasses = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };
  const textSize = { sm: "text-xs", md: "text-sm", lg: "text-base" };

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div className={`${sizeClasses[size]} bg-primary-600 rounded-xl flex items-center justify-center animate-pulse-soft`}>
          <span className={`text-white font-bold ${size === "sm" ? "text-xs" : size === "lg" ? "text-xl" : "text-sm"}`}>CG</span>
        </div>
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-xl border-2 border-primary-300 dark:border-primary-700 animate-ping opacity-20`} />
      </div>
      {message && (
        <p className={`text-gray-400 dark:text-gray-500 ${textSize[size]} font-medium`}>{message}</p>
      )}
    </div>
  );
}
