"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/pending-review"];

/**
 * Keeps auth in sync across tabs and expired sessions.
 * When the session ends elsewhere, redirect to login immediately.
 */
export function AuthSessionListener() {
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") return;

      const path = window.location.pathname;
      const isPublic = PUBLIC_PATHS.some(
        (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`)
      );
      if (!isPublic) {
        window.location.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
