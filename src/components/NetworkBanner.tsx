import { useState, useEffect } from "react";

/**
 * NetworkBanner - Shows a persistent banner when the user is offline.
 * 
 * This is important for Indian users who frequently experience network 
 * drops when switching between WiFi and mobile data (3G/4G).
 * 
 * Place this component at the very top of the app, inside the Router 
 * but outside all page components.
 */
export function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show "back online" message briefly
        setShowReconnected(true);
        setTimeout(() => {
          setShowReconnected(false);
          setWasOffline(false);
        }, 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  // Show nothing when online and not recently reconnected
  if (isOnline && !showReconnected) return null;

  // Show "back online" banner briefly after reconnecting
  if (showReconnected) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium py-2 px-4 shadow-lg"
        role="status"
        aria-live="polite"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>You are back online</span>
      </div>
    );
  }

  // Show offline banner
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-medium py-2 px-4 shadow-lg"
      role="alert"
      aria-live="assertive"
    >
      <svg className="w-4 h-4 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
      </svg>
      <span>No internet connection — please check your network</span>
    </div>
  );
}