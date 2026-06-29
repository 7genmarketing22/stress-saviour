import Link from "next/link";
import Image from "next/image";

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
          <Link href="/" className="inline-flex w-fit items-center rounded-xl bg-white/95 px-3 py-2 shadow-lg" aria-label="Stress Saviors home">
            <Image
              src="/stress-savious-logo.png"
              alt="Stress Saviors"
              width={500}
              height={500}
              className="h-10 w-auto"
            />
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
            className="inline-flex items-center lg:hidden"
            aria-label="Stress Saviors home"
          >
            <Image
              src="/stress-savious-logo.png"
              alt="Stress Saviors"
              width={500}
              height={500}
              className="h-9 w-auto"
            />
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
