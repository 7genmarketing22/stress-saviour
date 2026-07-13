"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getApprovedDoctors } from "@/lib/patient/api";
import { mapToDoctorCard } from "@/lib/patient/mappers";
import { BookingModal } from "@/components/public/BookingModal";
import { DoctorSearchFilters } from "@/components/public/DoctorSearchFilters";
import { DoctorGridCard, DoctorListCard } from "@/components/public/DoctorListCard";
import { createClient } from "@/lib/supabase/client";
import {
  buildFilterTitle,
  filterDoctors,
  getActiveTaxonomyFilter,
  parseDoctorSearchParams,
} from "@/lib/public/doctor-filters";
import type { DoctorWithProfile } from "@/lib/patient/types";
import type { UserRole } from "@/types";

interface DoctorsBrowseProps {
  initialDoctors?: DoctorWithProfile[];
  title?: string;
  subtitle?: string;
  limit?: number;
  layout?: "grid" | "list";
  showFilters?: boolean;
}

export function DoctorsBrowse({
  initialDoctors,
  title,
  subtitle,
  limit,
  layout = "list",
  showFilters = true,
}: DoctorsBrowseProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseDoctorSearchParams(searchParams);

  const [doctors, setDoctors] = useState<DoctorWithProfile[]>(initialDoctors ?? []);
  const [loading, setLoading] = useState(!initialDoctors);
  const [bookingDoctor, setBookingDoctor] = useState<ReturnType<typeof mapToDoctorCard> | null>(
    null
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [isPatient, setIsPatient] = useState(false);

  useEffect(() => {
    if (!initialDoctors) {
      getApprovedDoctors()
        .then(setDoctors)
        .catch(() => setDoctors([]))
        .finally(() => setLoading(false));
    }
  }, [initialDoctors]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setIsPatient(false);
        setAuthChecked(true);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setIsPatient((profile as { role: UserRole } | null)?.role === "patient");
      setAuthChecked(true);
    });
  }, []);

  const filteredDoctors = useMemo(() => {
    const results = filterDoctors(doctors, filters);
    return limit ? results.slice(0, limit) : results;
  }, [doctors, filters, limit]);

  const pageTitle = title ?? buildFilterTitle(filters);
  const activeTaxonomy = getActiveTaxonomyFilter(filters);
  const pageSubtitle =
    subtitle ??
    (filters.city
      ? `Showing verified mental health professionals in ${filters.city}. Book online instantly.`
      : "Consult online with PMDC-verified mental health professionals across Pakistan.");

  const handleBook = (doc: ReturnType<typeof mapToDoctorCard>) => {
    if (!authChecked) return;

    if (!isPatient) {
      const redirect = `/doctors/${doc.id}?book=true`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}&role=patient`);
      return;
    }

    setBookingDoctor(doc);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-slate-400">
          Stress Saviors › Find Doctors
          {filters.city ? ` › ${filters.city}` : ""}
          {filters.specialty ? ` › ${filters.specialty}` : ""}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {filteredDoctors.length > 0 ? filteredDoctors.length : ""}{" "}
          {pageTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">{pageSubtitle}</p>
        {activeTaxonomy && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm text-brand-700">
            <span>
              Showing doctors for: <strong>{activeTaxonomy.label}</strong>
            </span>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-brand-600 hover:bg-brand-100"
            >
              <X className="h-3 w-3" />
              Clear
            </Link>
          </div>
        )}
      </div>

      {showFilters && !limit && <DoctorSearchFilters resultCount={filteredDoctors.length} />}

      <div
        className={
          layout === "grid"
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-5"
        }
      >
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map((doc, index) =>
            layout === "grid" ? (
              <DoctorGridCard key={doc.id} doctor={doc} onBook={() => handleBook(doc)} />
            ) : (
              <DoctorListCard
                key={doc.id}
                doctor={doc}
                rank={index + 1}
                onBookVideo={() => handleBook(doc)}
                onBookAppointment={() => handleBook(doc)}
              />
            )
          )
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <h4 className="text-lg font-semibold text-slate-900">No doctors found</h4>
            <p className="mt-2 text-sm text-slate-500">
              {doctors.length === 0
                ? "No approved doctors on the platform yet. Check back soon."
                : activeTaxonomy
                  ? `No doctors are currently available for ${activeTaxonomy.label}. Try browsing all doctors or choose another category.`
                  : "Try adjusting your city, specialty, or filter options."}
            </p>
            <Link href="/doctors" className="mt-4 inline-block">
              <Button variant="outline">
                {activeTaxonomy ? "Browse all doctors" : "Clear all filters"}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {limit && doctors.length > limit && (
        <div className="text-center">
          <Link href="/doctors">
            <Button className="gap-2 bg-[#102c7b] font-semibold text-white hover:bg-[#152a45]">
              View All Doctors
            </Button>
          </Link>
        </div>
      )}

      {bookingDoctor && isPatient && (
        <BookingModal
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          onSuccess={() => {
            setBookingDoctor(null);
            router.push("/patient/appointments");
          }}
        />
      )}
    </div>
  );
}
