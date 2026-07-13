"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, MapPin, Search, Star, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  buildDoctorSearchUrl,
  filterDoctors,
  ALL_CITIES_LABEL,
} from "@/lib/public/doctor-filters";
import { getApprovedDoctors } from "@/lib/patient/api";
import { FEATURED_SPECIALTIES } from "@/lib/public/catalog";
import { PAKISTAN_CITIES } from "@/types";
import type { DoctorWithProfile } from "@/lib/patient/types";
import { cn } from "@/lib/utils";

const POPULAR_CITIES = ["Lahore", "Karachi", "Islamabad", "Multan", "Peshawar", "Faisalabad"];

// Words the hero heading rotates through — specialties & common conditions.
const ROTATING_TERMS = [
  "Mental Health Doctor",
  "Psychiatrist",
  "Psychologist",
  "Anxiety Specialist",
  "Depression Therapist",
  "Stress Counselor",
  "Sleep Therapist",
];

const MAX_LIVE_RESULTS = 6;

interface DoctorSearchHeroProps {
  doctorCount?: number;
  compact?: boolean;
  doctors?: DoctorWithProfile[];
}

function RotatingHeadingTerm({ terms, interval = 2400 }: { terms: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % terms.length);
        setVisible(true);
      }, 350);
    }, interval);
    return () => clearInterval(id);
  }, [terms.length, interval]);

  return (
    <span
      key={index}
      className={cn(
        "inline-block bg-gradient-to-r from-brand-500 to-brand-300 bg-clip-text text-transparent transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-y-0" : "-translate-y-1.5 opacity-0"
      )}
    >
      {terms[index]}
    </span>
  );
}

export function DoctorSearchHero({
  doctorCount = 0,
  compact = false,
  doctors: initialDoctors,
}: DoctorSearchHeroProps) {
  const router = useRouter();
  const [city, setCity] = useState(ALL_CITIES_LABEL);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [showResults, setShowResults] = useState(false);
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>(initialDoctors ?? []);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep local doctor pool in sync with any server-provided list.
  useEffect(() => {
    if (initialDoctors?.length) setDoctors(initialDoctors);
  }, [initialDoctors]);

  // Fallback: fetch the doctor pool client-side if none was provided.
  useEffect(() => {
    if (initialDoctors?.length) return;
    let cancelled = false;
    getApprovedDoctors()
      .then((data) => {
        if (!cancelled) setDoctors(data);
      })
      .catch(() => {
        if (!cancelled) setDoctors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [initialDoctors]);

  const buildUrl = (overrides?: { city?: string; q?: string; specialty?: string }) => {
    const selectedCity = overrides?.city ?? city;
    const selectedQuery = overrides?.q ?? query;
    const selectedSpecialty = overrides?.specialty ?? specialty;

    return buildDoctorSearchUrl({
      q: selectedQuery,
      city: selectedCity === ALL_CITIES_LABEL ? undefined : selectedCity,
      specialty: selectedSpecialty === "All" ? undefined : selectedSpecialty,
    });
  };

  const hasActiveSearch =
    query.trim().length > 0 || specialty !== "All" || city !== ALL_CITIES_LABEL;

  const doctorPool = doctors.length > 0 ? doctors : (initialDoctors ?? []);

  const liveResults = useMemo(() => {
    if (!hasActiveSearch) return [];
    return filterDoctors(doctorPool, {
      q: query.trim() || undefined,
      city: city === ALL_CITIES_LABEL ? undefined : city,
      specialty: specialty === "All" ? undefined : specialty,
    });
  }, [doctorPool, query, city, specialty, hasActiveSearch]);

  const visibleResults = liveResults.slice(0, MAX_LIVE_RESULTS);
  const panelOpen = showResults && hasActiveSearch;

  // Close the results panel when clicking outside the search area.
  useEffect(() => {
    if (!panelOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [panelOpen]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setShowResults(false);
    router.push(buildUrl());
  };

  const selectCity = (selected: string) => {
    setCity(selected);
    setShowResults(true);
  };

  return (
    <div className={cn("relative", compact ? "space-y-4" : "space-y-8")}>
      {!compact && (
        <div className="space-y-4 text-center lg:text-left">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand-100/80 bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold text-brand-700 shadow-sm backdrop-blur sm:px-4 sm:text-xs">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand-400" />
            <span className="whitespace-nowrap">
              PMDC-verified
              <span className="hidden sm:inline"> · Secure video consultations</span>
  
            </span>
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Find the Best{" "}
            <RotatingHeadingTerm terms={ROTATING_TERMS} />{" "}
            Near You
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 lg:mx-0 lg:text-lg">
            Search by city, specialty, or doctor name. Book video, chat, or in-person consultations
            with licensed professionals across Pakistan.
          </p>
          {doctorCount > 0 && (
            <p className="text-sm font-medium text-brand-600">
              {doctorCount}+ verified doctors available to book online
            </p>
          )}
        </div>
      )}

      {/* Search bar — Marham-style */}
      <div ref={containerRef} className="relative z-40">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-slate-200/50 sm:p-3">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-2 lg:flex-row lg:items-stretch"
          >
            <div className="relative min-w-[140px] lg:w-44">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setShowResults(true);
                }}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              >
                <option value={ALL_CITIES_LABEL}>{ALL_CITIES_LABEL}</option>
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Search by doctor name, specialty, or condition..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
            </div>

            <div className="relative min-w-[160px] lg:w-52">
              <Stethoscope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={specialty}
                onChange={(e) => {
                  setSpecialty(e.target.value);
                  setShowResults(true);
                }}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
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
              className="h-12 gap-2 rounded-xl bg-[#102c7b] px-8 text-sm font-semibold text-white hover:bg-[#152a45] lg:min-w-[120px]"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </div>

        {/* Live search results */}
        {panelOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 ring-1 ring-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {liveResults.length > 0
                  ? `${liveResults.length} doctor${liveResults.length === 1 ? "" : "s"} found`
                  : "No matches"}
              </p>
              {liveResults.length > 0 && (
                <Link
                  href={buildUrl()}
                  onClick={() => setShowResults(false)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  View all
                </Link>
              )}
            </div>

            {visibleResults.length > 0 ? (
              <ul className="max-h-[22rem] divide-y divide-slate-50 overflow-y-auto">
                {visibleResults.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/doctors/${doc.id}`}
                      onClick={() => setShowResults(false)}
                      className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-50/60"
                    >
                      <UserAvatar
                        name={doc.name}
                        avatarUrl={doc.avatarUrl}
                        size="sm"
                        className="h-11 w-11"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{doc.name}</p>
                        <p className="truncate text-xs font-medium text-brand-600">
                          {doc.specialization}
                        </p>
                        <p className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {doc.city}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {doc.rating > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                            <Star className="h-3 w-3 fill-amber-500" />
                            {doc.rating.toFixed(1)}
                          </span>
                        )}
                        <p className="text-xs font-semibold text-slate-700">
                          {doc.consultationFee}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-900">No doctors match your search</p>
                <p className="mt-1 text-xs text-slate-500">
                  Try a different name, specialty, or condition.
                </p>
                <Link
                  href="/doctors"
                  onClick={() => setShowResults(false)}
                  className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline"
                >
                  Browse all doctors
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* City quick links */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
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
                ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600"
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
