"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientAssessmentRedirectPage() {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace("/assessment");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
      Redirecting to Behavioral Health Assessment...
    </div>
  );
}
