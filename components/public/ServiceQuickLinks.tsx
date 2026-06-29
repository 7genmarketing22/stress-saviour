import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  MessageSquare,
  Phone,
  Stethoscope,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  {
    title: "Video Consultation",
    subtitle: "PMDC verified doctors",
    description: "Consult a doctor online from home",
    icon: Video,
    href: "/doctors?availableNow=true",
    gradient: "from-teal-500 to-cyan-600",
    glow: "group-hover:shadow-teal-200/60",
    iconRing: "group-hover:ring-teal-200",
  },
  {
    title: "Book Appointment",
    subtitle: "In-clinic visits",
    description: "Book an in-person consultation",
    icon: Building2,
    href: "/doctors",
    gradient: "from-[#1e3a5f] to-[#2d5a8a]",
    glow: "group-hover:shadow-blue-200/60",
    iconRing: "group-hover:ring-blue-200",
  },
  {
    title: "Chat Consultation",
    subtitle: "Text-based sessions",
    description: "Flexible async messaging support",
    icon: MessageSquare,
    href: "/doctors?specialty=Psychologist",
    gradient: "from-violet-500 to-purple-600",
    glow: "group-hover:shadow-violet-200/60",
    iconRing: "group-hover:ring-violet-200",
  },
  {
    title: "Talk to Us",
    subtitle: "15/7 support",
    description: "Get help choosing the right doctor",
    icon: Phone,
    href: "/#faq",
    gradient: "from-emerald-500 to-teal-600",
    glow: "group-hover:shadow-emerald-200/60",
    iconRing: "group-hover:ring-emerald-200",
  },
];

export function ServiceQuickLinks({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {services.map((service) => {
        const Icon = service.icon;
        return (
          <Link
            key={service.title}
            href={service.href}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300",
              "hover:-translate-y-1 hover:border-transparent hover:shadow-xl",
              service.glow
            )}
          >
            {/* Soft gradient wash on hover */}
            <span
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]",
                service.gradient
              )}
            />
            {/* Decorative corner blob */}
            <span
              className={cn(
                "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-10 blur-xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-20",
                service.gradient
              )}
            />

            <div className="relative flex items-start justify-between">
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ring-2 ring-transparent transition-all duration-300 group-hover:scale-110",
                  service.gradient,
                  service.iconRing
                )}
              >
                <Icon className="h-6 w-6" />
              </span>
              <ArrowUpRight className="h-5 w-5 -translate-y-1 translate-x-1 text-slate-300 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-slate-500 group-hover:opacity-100" />
            </div>

            <div className="relative mt-5">
              <h3 className="font-bold text-slate-900">{service.title}</h3>
              <p className="mt-0.5 text-xs font-semibold text-teal-700">{service.subtitle}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{service.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function SpecialtyQuickLinks() {
  const links = [
    { label: "Psychiatrist", href: "/doctors?specialty=Psychiatrist" },
    { label: "Psychologist", href: "/doctors?specialty=Psychologist" },
    { label: "General Physician", href: "/doctors?specialty=General%20Physician" },
    { label: "Neurologist", href: "/doctors?specialty=Neurologist" },
    { label: "Nutritionist", href: "/doctors?specialty=Nutritionist" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Stethoscope className="h-4 w-4 text-slate-400" />
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
