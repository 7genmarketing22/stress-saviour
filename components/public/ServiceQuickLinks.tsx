import Link from "next/link";
import {
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
    accent: "from-teal-500 to-cyan-600",
    iconBg: "bg-teal-100 text-teal-700",
  },
  {
    title: "Book Appointment",
    subtitle: "In-clinic visits",
    description: "Book an in-person consultation",
    icon: Building2,
    href: "/doctors",
    accent: "from-[#1e3a5f] to-[#2d5a8a]",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    title: "Chat Consultation",
    subtitle: "Text-based sessions",
    description: "Flexible async messaging support",
    icon: MessageSquare,
    href: "/doctors?specialty=Psychologist",
    accent: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-100 text-violet-700",
  },
  {
    title: "Talk to Us",
    subtitle: "15/7 support",
    description: "Get help choosing the right doctor",
    icon: Phone,
    href: "/#faq",
    accent: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-100 text-emerald-700",
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
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-teal-200 hover:shadow-lg"
          >
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100",
                service.accent
              )}
            />
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                service.iconBg
              )}
            >
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-bold text-slate-900">{service.title}</h3>
            <p className="text-xs font-medium text-teal-700">{service.subtitle}</p>
            <p className="mt-1 text-sm text-slate-500">{service.description}</p>
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
