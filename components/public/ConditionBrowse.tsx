"use client";

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
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
        <Link
          href={viewAllHref ?? "/doctors"}
          className="inline-flex items-center gap-0.5 text-sm font-semibold text-teal-700 hover:underline"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {items.map((item) => {
          const Icon = CATALOG_ICONS[item.icon];
          const href = buildDoctorSearchUrl(
            type === "symptom" ? { symptom: item.id } : { condition: item.id }
          );

          return (
            <Link
              key={item.id}
              href={href}
              className="group flex w-[100px] shrink-0 snap-start flex-col items-center gap-2.5 sm:w-[110px]"
            >
              <span
                className={cn(
                  "flex h-[72px] w-[72px] items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm transition-all group-hover:border-teal-200 group-hover:shadow-md sm:h-20 sm:w-20",
                  item.bg
                )}
              >
                <Icon className={cn("h-8 w-8 sm:h-9 sm:w-9", item.color)} />
              </span>
              <span className="text-center text-[11px] font-semibold leading-tight text-slate-700 group-hover:text-teal-700 sm:text-xs">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
