"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/**
 * Invisible component that keeps the Supabase session alive in PWA contexts.
 * - Listens for visibility changes (app resume from background)
 * - Listens for online events (reconnection after offline)
 * - Proactively refreshes the session to prevent unexpected logouts
 */
export function AuthRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Listen for auth state changes (token refresh, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
      if (event === "TOKEN_REFRESHED") {
        // Trigger a soft refresh so server components pick up new cookies
        router.refresh();
      }
    });

    // When the PWA comes back to the foreground, refresh the session
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const { error } = await supabase.auth.getSession();
        if (error) {
          // Session is dead, redirect to login
          router.push("/login");
        }
      }
    };

    // When the device comes back online, refresh the session
    const handleOnline = async () => {
      await supabase.auth.getSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [router]);

  return null;
}
