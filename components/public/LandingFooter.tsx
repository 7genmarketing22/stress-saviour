import Link from "next/link";
import { Brain, Mail, MapPin, Phone } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 font-semibold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600">
                <Brain className="h-5 w-5" />
              </span>
              Stress Saviors
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              Pakistan&apos;s trusted telehealth platform for mental health. Connect with
              PMDC-verified doctors from anywhere.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              For Patients
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/doctors" className="hover:text-teal-400 transition-colors">
                  Browse Doctors
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-teal-400 transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-teal-400 transition-colors">
                  Patient Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              For Professionals
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="hover:text-teal-400 transition-colors">
                  Doctor Login
                </Link>
              </li>
              <li>
                <Link href="/register?role=doctor" className="hover:text-teal-400 transition-colors">
                  Join as Doctor
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Contact
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-teal-500 shrink-0" />
                <span>support@stresssaviors.pk</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-teal-500 shrink-0" />
                <span>+92 300 1234567</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                <span>Lahore · Karachi · Islamabad · Nationwide</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Stress Saviors. All rights reserved.</p>
          <p>Urdu & English · Secure & Confidential</p>
        </div>
      </div>
    </footer>
  );
}
