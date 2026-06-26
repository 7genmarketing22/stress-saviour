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
import { getDoctorContext } from "@/lib/doctor/api";
import type { DoctorContextData } from "@/lib/doctor/types";
import { Button } from "@/components/ui/Button";

interface DoctorContextValue extends DoctorContextData {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setDocuments: (documents: DoctorContextData["documents"]) => void;
  setProfile: (profile: DoctorContextData["profile"]) => void;
  setDoctorProfile: (doctorProfile: DoctorContextData["doctorProfile"]) => void;
}

const DoctorContext = createContext<DoctorContextValue | null>(null);

export function DoctorProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<DoctorContextData["profile"] | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorContextData["doctorProfile"] | null>(
    null
  );
  const [documents, setDocuments] = useState<DoctorContextData["documents"]>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDoctorContext();
      if (!result.ok) {
        setError(result.message);
        setProfile(null);
        setDoctorProfile(null);
        setDocuments({});
        return;
      }
      setProfile(result.data.profile);
      setDoctorProfile(result.data.doctorProfile);
      setDocuments(result.data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load doctor data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<DoctorContextValue | null>(() => {
    if (!profile || !doctorProfile) {
      if (isLoading) return null;
      return null;
    }

    return {
      profile,
      doctorProfile,
      documents,
      isLoading,
      error,
      refresh,
      setDocuments,
      setProfile,
      setDoctorProfile,
    };
  }, [profile, doctorProfile, documents, isLoading, error, refresh]);

  if (isLoading && !value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading doctor portal...</p>
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-lg font-semibold">Doctor profile unavailable</p>
          <p className="text-sm text-muted-foreground">
            {error ?? "Your account is not linked to a doctor profile yet."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={refresh} variant="outline">
              Try again
            </Button>
            <Link href="/login">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                Go to login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export function useDoctor() {
  const context = useContext(DoctorContext);
  if (!context) {
    throw new Error("useDoctor must be used within DoctorProvider");
  }
  return context;
}

export function useDoctorOptional() {
  return useContext(DoctorContext);
}
