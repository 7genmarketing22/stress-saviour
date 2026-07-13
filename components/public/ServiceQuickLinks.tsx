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
    iconClassName: "text-brand-500",
  },
  {
    title: "Book Appointment",
    subtitle: "In-clinic visits",
    description: "Book an in-person consultation",
    icon: Building2,
    href: "/doctors",
    iconClassName: "text-brand-800",
  },
  {
    title: "Chat Consultation",
    subtitle: "Text-based sessions",
    description: "Flexible async messaging support",
    icon: MessageSquare,
    href: "/doctors?specialty=Psychologist",
    iconClassName: "text-violet-600",
  },
  {
    title: "Talk to Us",
    subtitle: "15/7 support",
    description: "Get help choosing the right doctor",
    icon: Phone,
    href: "/#faq",
    iconClassName: "text-emerald-600",
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
              "group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            )}
          >
            <div className="flex items-start justify-between">
              <Icon
                className={cn("h-8 w-8", service.iconClassName)}
                strokeWidth={1.75}
              />
              <ArrowUpRight className="h-5 w-5 -translate-y-1 translate-x-1 text-slate-300 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-slate-500 group-hover:opacity-100" />
            </div>

            <div className="mt-5">
              <h3 className="font-bold text-slate-900">{service.title}</h3>
              <p className="mt-0.5 text-xs font-semibold text-brand-600">{service.subtitle}</p>
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
          className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
