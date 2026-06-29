"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/doctors", label: "Find Doctors" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/doctors?specialty=Psychiatrist", label: "Psychiatrists" },
  { href: "/doctors?specialty=Psychologist", label: "Psychologists" },
  { href: "/#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-28 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center" aria-label="Stress Saviors home">
          <Image
            src="/stress-savious-logo.png"
            alt="Stress Saviors"
            width={500}
            height={500}
            priority
            className="h-20 w-auto sm:h-24"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-teal-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="ghost" className="font-medium text-slate-700">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-teal-600 font-medium text-white shadow-sm hover:bg-teal-700">
              Sign Up Free
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-slate-100 bg-white md:hidden",
          mobileOpen ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full">
                Login
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-teal-600 text-white hover:bg-teal-700">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
