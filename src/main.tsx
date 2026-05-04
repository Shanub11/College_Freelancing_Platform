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

posthog.init('phc_C4pB6yahx9gBZKVoSbxL7Q9Ruec4Bgjspi2m7LRLV4z2', {
  api_host: 'https://us.i.posthog.com',
});

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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
