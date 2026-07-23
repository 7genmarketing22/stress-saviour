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
import { getPatientContext } from "@/lib/patient/api";
import type { PatientContextData } from "@/lib/patient/types";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";

interface PatientContextValue extends PatientContextData {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setProfile: (profile: PatientContextData["profile"]) => void;
}

const PatientContext = createContext<PatientContextValue | null>(null);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PatientContextData["profile"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPatientContext();
      if (!result.ok) {
        setError(result.message);
        setProfile(null);
        return;
      }
      setProfile(result.data.profile);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load patient data"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<PatientContextValue | null>(() => {
    if (!profile) {
      if (isLoading) return null;
      return null;
    }
    return { profile, isLoading, error, refresh, setProfile };
  }, [profile, isLoading, error, refresh]);

  if (isLoading && !value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading patient portal...</p>
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-lg font-semibold">Patient profile unavailable</p>
          <p className="text-sm text-muted-foreground">
            {error ?? "Your account is not linked to a patient profile yet."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={refresh} variant="outline">
              Try again
            </Button>
            <Link href="/login">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                Go to login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatient must be used within PatientProvider");
  }
  return context;
}
