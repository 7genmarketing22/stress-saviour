"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin, Search, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildDoctorSearchUrl } from "@/lib/public/doctor-filters";
import { FEATURED_SPECIALTIES } from "@/lib/public/catalog";
import { PAKISTAN_CITIES } from "@/types";
import { cn } from "@/lib/utils";

const POPULAR_CITIES = ["Lahore", "Karachi", "Islamabad", "Multan", "Peshawar", "Faisalabad"];

interface DoctorSearchHeroProps {
  doctorCount?: number;
  compact?: boolean;
}

export function DoctorSearchHero({ doctorCount = 0, compact = false }: DoctorSearchHeroProps) {
  const router = useRouter();
  const [city, setCity] = useState("Lahore");
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All");

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    router.push(
      buildDoctorSearchUrl({
        q: query,
        city,
        specialty: specialty === "All" ? undefined : specialty,
      })
    );
  };

  const selectCity = (selected: string) => {
    setCity(selected);
    router.push(buildDoctorSearchUrl({ city: selected, specialty: specialty === "All" ? undefined : specialty }));
  };

  return (
    <div className={cn("relative", compact ? "space-y-4" : "space-y-8")}>
      {!compact && (
        <div className="space-y-4 text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-white/70 px-4 py-1.5 text-xs font-semibold text-teal-800 shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
            PMDC-verified · Secure video consultations · Urdu & English
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Find the Best{" "}
            <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Mental Health Doctor
            </span>{" "}
            Near You
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 lg:mx-0 lg:text-lg">
            Search by city, specialty, or doctor name. Book video, chat, or in-person consultations
            with licensed professionals across Pakistan.
          </p>
          {doctorCount > 0 && (
            <p className="text-sm font-medium text-teal-700">
              {doctorCount}+ verified doctors available to book online
            </p>
          )}
        </div>
      )}

      {/* Search bar — Marham-style */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-slate-200/50 sm:p-3">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-2 lg:flex-row lg:items-stretch"
        >
          <div className="relative min-w-[140px] lg:w-44">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              {PAKISTAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by doctor name, specialty, or condition..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="relative min-w-[160px] lg:w-52">
            <Stethoscope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="All">All Specialties</option>
              {FEATURED_SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <Button
            type="submit"
            className="h-12 gap-2 rounded-xl bg-[#1e3a5f] px-8 text-sm font-semibold text-white hover:bg-[#152a45] lg:min-w-[120px]"
          >
            <Search className="h-4 w-4" />
            Search
          </Button>
        </form>
      </div>

      {/* City quick links */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Popular:
        </span>
        {POPULAR_CITIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => selectCity(c)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
              city === c
                ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
