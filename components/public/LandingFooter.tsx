import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-slate-200 bg-white text-slate-600">
      {/* Soft glow */}
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-4 lg:col-span-4">
            <Link href="/" className="inline-flex items-center" aria-label="Stress Saviors home">
              <Image
                src="/stress-savious-logo.png"
                alt="Stress Saviors"
                width={500}
                height={500}
                className="h-24 w-auto sm:h-28"
              />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              Pakistan&apos;s trusted telehealth platform for mental health. Connect with
              PMDC-verified doctors from anywhere.
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-teal-800 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              Secure &amp; Confidential
            </span>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-900">
              For Patients
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/doctors" className="text-slate-500 transition-colors hover:text-teal-700">
                  Browse Doctors
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-slate-500 transition-colors hover:text-teal-700">
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-500 transition-colors hover:text-teal-700">
                  Patient Login
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-900">
              For Professionals
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="text-slate-500 transition-colors hover:text-teal-700">
                  Doctor Login
                </Link>
              </li>
              <li>
                <Link href="/register?role=doctor" className="text-slate-500 transition-colors hover:text-teal-700">
                  Join as Doctor
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-900">
              Contact
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-teal-100 bg-white shadow-sm">
                  <Mail className="h-3.5 w-3.5 text-teal-600" />
                </span>
                <span className="text-slate-500">support@stresssaviors.pk</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-teal-100 bg-white shadow-sm">
                  <Phone className="h-3.5 w-3.5 text-teal-600" />
                </span>
                <span className="text-slate-500">+92 300 1234567</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-teal-100 bg-white shadow-sm">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" />
                </span>
                <span className="text-slate-500">Lahore · Karachi · Islamabad · Nationwide</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Stress Saviors. All rights reserved.</p>
          <p>Urdu &amp; English · Available Nationwide</p>
        </div>
      </div>
    </footer>
  );
}
