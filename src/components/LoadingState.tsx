import React from "react";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "skeleton";
  rows?: number;
}

export default function LoadingState({
  message = "Loading...",
  size = "md",
  variant = "spinner",
  rows = 3,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10", 
    lg: "h-16 w-16",
  };

  if (variant === "skeleton") {
    return (
      <div className="space-y-4 w-full">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"/>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded-full w-3/4"/>
                <div className="h-3 bg-gray-100 rounded-full w-1/2"/>
              </div>
              <div className="h-6 bg-gray-200 rounded-full w-16 flex-shrink-0"/>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 bg-gray-100 rounded-full w-full"/>
              <div className="h-3 bg-gray-100 rounded-full w-5/6"/>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-3 bg-gray-100 rounded-full w-16"/>
              <div className="h-3 bg-gray-100 rounded-full w-20"/>
              <div className="h-3 bg-gray-100 rounded-full w-14"/>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {message && (
        <p className="text-gray-400 text-sm mt-4 font-medium">{message}</p>
      )}
    </div>
  );
}
