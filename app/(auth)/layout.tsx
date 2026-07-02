import Link from "next/link";
import Image from "next/image";
import { AuthAsidePanel } from "@/components/auth/AuthAsidePanel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthAsidePanel />

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
