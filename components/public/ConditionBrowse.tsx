"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Brain,
  ChevronRight,
  CloudRain,
  Flame,
  HeartCrack,
  Moon,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { buildDoctorSearchUrl } from "@/lib/public/doctor-filters";
import type { CatalogIconKey, CatalogItem } from "@/lib/public/catalog";
import { cn } from "@/lib/utils";

const CATALOG_ICONS: Record<CatalogIconKey, LucideIcon> = {
  brain: Brain,
  "cloud-rain": CloudRain,
  flame: Flame,
  "heart-crack": HeartCrack,
  moon: Moon,
  "refresh-cw": RefreshCw,
  "shield-alert": ShieldAlert,
  sparkles: Sparkles,
  users: Users,
  wind: Wind,
  zap: Zap,
};

interface ConditionBrowseProps {
  title: string;
  items: CatalogItem[];
  type: "symptom" | "condition";
  viewAllHref?: string;
}

export function ConditionBrowse({ title, items, type, viewAllHref }: ConditionBrowseProps) {
  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {type === "symptom"
              ? "Pick what you're feeling to find the right specialist."
              : "Browse common conditions and connect with an expert."}
          </p>
        </div>
        <Link
          href={viewAllHref ?? "/doctors"}
          className="group inline-flex shrink-0 items-center gap-0.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-teal-700 shadow-sm transition-all hover:border-teal-300 hover:bg-teal-50"
        >
          View all
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8">
        {items.map((item) => (
          <ConditionCard key={item.id} item={item} type={type} />
        ))}
      </div>
    </section>
  );
}

function ConditionCard({ item, type }: { item: CatalogItem; type: "symptom" | "condition" }) {
  const Icon = CATALOG_ICONS[item.icon];
  const href = buildDoctorSearchUrl(
    type === "symptom" ? { symptom: item.id } : { condition: item.id }
  );
  const ring = item.ring ?? "from-teal-300 to-cyan-200";

  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2.5 rounded-2xl p-2 transition-colors hover:bg-white"
    >
      {/* Smart gradient border ring */}
      <span
        className={cn(
          "relative rounded-full bg-gradient-to-br p-[2px] shadow-sm transition-all duration-300",
          "group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-teal-100",
          ring
        )}
      >
        <span
          className={cn(
            "relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-white sm:h-20 sm:w-20",
            "transition-transform duration-300 group-hover:scale-[1.04]"
          )}
        >
          {item.image ? (
            <Image
              src={item.image}
              alt={item.label}
              width={80}
              height={80}
              className="h-full w-full object-contain p-1.5 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-3"
            />
          ) : (
            <span
              className={cn(
                "flex h-full w-full items-center justify-center transition-transform duration-500 group-hover:scale-110",
                item.bg
              )}
            >
              <Icon className={cn("h-8 w-8 sm:h-9 sm:w-9", item.color)} />
            </span>
          )}
          {/* Glossy hover sheen */}
          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/0 to-white/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </span>
      </span>

      <span className="text-center text-[11px] font-semibold leading-tight text-slate-700 transition-colors group-hover:text-teal-700 sm:text-xs">
        {item.label}
      </span>
    </Link>
  );
}
