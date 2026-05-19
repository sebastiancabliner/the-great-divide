import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import TheGreatDivide from "./TheGreatDivide.jsx";

Sentry.init({
  dsn: "https://1352e358516498a2977cf99ec1fc4f78@o4511413035794432.ingest.us.sentry.io/4511416744935424",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  environment: import.meta.env.MODE,
  beforeSend(event) {
    // Drop noisy browser-extension errors
    const msg = event.exception?.values?.[0]?.value || "";
    if (/extension|chrome-extension|moz-extension/i.test(msg)) return null;
    return event;
  },
});

const FallbackUI = () => (
  <div style={{ minHeight: "100vh", background: "#0f1221", color: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
    <div style={{ fontFamily: "Anton, sans-serif", fontSize: 36, marginBottom: 12 }}>OOPS — SOMETHING BROKE</div>
    <p style={{ color: "#94A3B8", maxWidth: 380, lineHeight: 1.6, marginBottom: 24 }}>
      Our bad. The error was logged and we're on it. Try refreshing — usually that does the trick.
    </p>
    <button onClick={() => window.location.reload()}
      style={{ padding: "12px 28px", borderRadius: 10, background: "#1A56DB", color: "#fff", border: "none", fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: 1, cursor: "pointer" }}>
      RELOAD
    </button>
  </div>
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<FallbackUI />}>
      <TheGreatDivide />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
