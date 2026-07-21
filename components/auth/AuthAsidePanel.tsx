"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";

const AUTH_PANELS = {
  patient: {
    src: "/patient-login-page.jpg",
    alt: "Patient receiving care at Stress Saviors",
    title: "Your wellbeing comes first",
    description:
      "Book secure video consultations with licensed mental health professionals across Pakistan.",
  },
  doctor: {
    src: "/login-page-bg.jpg",
    alt: "Healthcare professional at Stress Saviors",
    title: "Care that fits your schedule",
    description:
      "Manage patients, appointments, and your practice from one trusted platform.",
  },
  default: {
    src: "/login-page-bg.jpg",
    alt: "Stress Saviors mental health platform",
    title: "Care that fits your schedule",
    description:
      "Connect with licensed mental health professionals across Pakistan — secure video consultations, when you need them.",
  },
} as const;

function resolvePanel(pathname: string, role: string | null) {
  const isAuthFlow = pathname === "/login" || pathname === "/register";
  if (!isAuthFlow) return AUTH_PANELS.default;
  if (role === "patient") return AUTH_PANELS.patient;
  if (role === "doctor") return AUTH_PANELS.doctor;
  return AUTH_PANELS.default;
}

function AuthAsideContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const panel = resolvePanel(pathname, role);

  return (
    <aside className="relative hidden lg:block min-h-screen overflow-hidden bg-slate-900">
      <Image
        key={panel.src}
        src={panel.src}
        alt={panel.alt}
        fill
        priority
        className="object-cover object-center transition-opacity duration-500"
        sizes="50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/25 to-slate-900/40" />

      <div className="relative z-10 flex h-full min-h-screen flex-col p-10 text-white">
        <Link
          href="/"
          className="inline-flex w-fit items-center"
          aria-label="Stress Saviors home"
        >
          <Image
            src="/stress-savious-logo.png"
            alt="Stress Saviors"
            width={500}
            height={500}
            className="h-16 w-auto drop-shadow-[0_2px_8px_rgba(255,255,255,0.65)]"
          />
        </Link>

        <div className="mt-auto space-y-4 max-w-md pb-2">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold leading-snug drop-shadow-sm">{panel.title}</h2>
            <p className="text-slate-200 text-sm leading-relaxed drop-shadow-sm">
              {panel.description}
            </p>
          </div>
          <p className="text-xs text-slate-300/90">
            Secure · PMDC-verified doctors · Built for Pakistan
          </p>
        </div>
      </div>
    </aside>
  );
}

function AuthAsideFallback() {
  return (
    <aside className="relative hidden lg:block min-h-screen overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-800 to-slate-900" />
    </aside>
  );
}

export function AuthAsidePanel() {
  return (
    <Suspense fallback={<AuthAsideFallback />}>
      <AuthAsideContent />
    </Suspense>
  );
}
