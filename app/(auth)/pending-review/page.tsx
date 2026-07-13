"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, LogOut, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { getAccountAccess, resolveDashboardPath } from "@/lib/auth/account-status";
import { logout } from "@/lib/auth/session";

export default function PendingReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [rejected, setRejected] = useState(false);
  const [roleLabel, setRoleLabel] = useState("account");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const access = await getAccountAccess(supabase, user.id);
      if (cancelled) return;

      if (access.canAccessDashboard && access.profile) {
        router.replace(resolveDashboardPath(access.profile.role));
        return;
      }

      setRejected(access.rejected);
      setMessage(access.message);
      setRoleLabel(access.profile?.role === "doctor" ? "doctor application" : "patient account");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    await logout("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Checking account status…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div
        className={`rounded-2xl border p-8 text-center shadow-sm ${
          rejected
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            rejected ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
          }`}
        >
          {rejected ? <XCircle className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
        </span>

        <h1 className="mt-4 text-xl font-bold text-slate-900">
          {rejected ? "Application not approved" : "Pending review"}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {message ||
            (rejected
              ? `Your ${roleLabel} could not be approved at this time.`
              : `Your ${roleLabel} is awaiting administrator approval. You'll be able to sign in to your dashboard once it's approved.`)}
        </p>

        {!rejected && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-1.5 text-xs font-medium text-amber-800">
            <ShieldAlert className="h-3.5 w-3.5" />
            Usually reviewed within 1–2 business days
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" onClick={() => router.refresh()} className="gap-2">
          Refresh status
        </Button>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
        <Link href="/">
          <Button className="w-full bg-brand-500 text-white hover:bg-brand-600 sm:w-auto">
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
