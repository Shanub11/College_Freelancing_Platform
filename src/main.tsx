import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
  replaysSessionSampleRate: 0.1, // Record 10% of standard user sessions
  replaysOnErrorSampleRate: 1.0, // Record 100% of sessions that end in an error
});

// Only initialize PostHog if the key is configured.
// Set VITE_POSTHOG_KEY in your .env.local file for local dev
// and in your Vercel environment variables for production.
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY as string, {
    api_host: 'https://us.i.posthog.com',
    // Disable in development to avoid polluting analytics
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        ph.opt_out_capturing();
      }
    },
  });
}

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!convexUrl) {
  throw new Error(
    "[CollegeGig] VITE_CONVEX_URL is not set. " +
    "Add it to your .env.local file: VITE_CONVEX_URL=https://your-deployment.convex.cloud"
  );
}

const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
if (!razorpayKeyId) {
  console.warn(
    "[CollegeGig] VITE_RAZORPAY_KEY_ID is not set. " +
    "Payments will not work until this is configured."
  );
}

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <HelmetProvider>
      <Sentry.ErrorBoundary fallback={
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Oops! Something went wrong.</h2>
          <p className="text-gray-600">Our engineering team has been notified and is looking into it.</p>
        </div>
      }>
        <App />
      </Sentry.ErrorBoundary>
    </HelmetProvider>
  </ConvexAuthProvider>,
);
