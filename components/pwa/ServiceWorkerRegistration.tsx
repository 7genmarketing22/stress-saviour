"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Pick up SW fixes (push handlers) without requiring a full reinstall.
        registration.update().catch(() => {});

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              // Activate updated worker on next navigation; push handler is available after claim.
            }
          });
        });
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }

    window.addEventListener("load", () => void register(), { once: true });
    return () => window.removeEventListener("load", () => void register());
  }, []);

  return null;
}
