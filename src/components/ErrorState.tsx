import React from "react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = "Something went wrong",
  message = "Please refresh the page and try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="py-12 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl">
        ⚠
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mt-4">{title}</h3>
      <p className="text-gray-600 mt-2 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 text-white px-4 py-2 rounded-lg mt-4 hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}