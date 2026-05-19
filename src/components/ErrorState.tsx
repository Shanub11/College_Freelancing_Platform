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
    <div className="py-16 text-center flex flex-col items-center justify-center animate-fade-in">
      <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-3xl mb-4">
        ⚠️
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary !bg-red-600 hover:!bg-red-700 mt-6 text-sm"
        >
          Try Again
        </button>
      )}
    </div>
  );
}