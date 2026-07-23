"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { getAdminContext } from "@/lib/admin/api";
import type { Profile } from "@/types";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";

interface AdminContextValue {
  profile: Profile;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminContext();
      if (!result.ok) {
        setError(result.message);
        setProfile(null);
        return;
      }
      setProfile(result.data.profile);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load admin data"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<AdminContextValue | null>(() => {
    if (!profile) return null;
    return { profile, isLoading, error, refresh };
  }, [profile, isLoading, error, refresh]);

  if (isLoading && !value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-lg font-semibold">Admin access required</p>
          <p className="text-sm text-muted-foreground">
            {error ?? "Your account is not linked to an administrator profile."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={refresh} variant="outline">
              Try again
            </Button>
            <Link href="/login">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white">Go to login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}
