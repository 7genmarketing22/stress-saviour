import Link from "next/link";
import Image from "next/image";
import { Brain } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="relative hidden lg:block min-h-screen overflow-hidden bg-slate-900">
        <Image
          src="/login-page-bg.jpg"
          alt="Healthcare professional at Stress Saviors"
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/25 to-slate-900/40" />

        <div className="relative z-10 flex h-full min-h-screen flex-col justify-between p-10 text-white">
          <Link href="/" className="inline-flex items-center gap-2.5 font-semibold text-white w-fit">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 shadow-lg">
              <Brain className="h-5 w-5" />
            </span>
            Stress Saviors
          </Link>

          <div className="space-y-3 max-w-md">
            <h2 className="text-3xl font-bold leading-snug drop-shadow-sm">
              Care that fits your schedule
            </h2>
            <p className="text-slate-200 text-sm leading-relaxed drop-shadow-sm">
              Connect with licensed mental health professionals across Pakistan —
              secure video consultations, when you need them.
            </p>
          </div>

          <p className="text-xs text-slate-300/90">
            Secure · PMDC-verified doctors · Built for Pakistan
          </p>
        </div>
      </aside>

      <div className="flex flex-col min-h-screen bg-[#f8fafb]">
        <div className="flex items-center justify-between px-6 py-4 lg:justify-end">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 lg:hidden"
          >
            <Brain className="h-4 w-4 text-teal-600" />
            Stress Saviors
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-6">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
