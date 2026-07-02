"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Languages,
  MapPin,
  MessageSquare,
  Star,
  Stethoscope,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { BookingModal } from "@/components/public/BookingModal";
import { createClient } from "@/lib/supabase/client";
import { mapToDoctorCard } from "@/lib/patient/mappers";
import { DAY_LABELS, formatSlotRange } from "@/lib/booking/slots";
import type { DoctorWithProfile } from "@/lib/patient/types";
import type { UserRole } from "@/types";

interface DoctorProfileClientProps {
  doctor: DoctorWithProfile;
  availabilitySlots: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    slot_duration_minutes: number;
  }>;
}

const SERVICES = [
  {
    type: "video" as const,
    icon: Video,
    title: "Video Consultation",
    description: "Secure HD video sessions from the comfort of your home.",
  },
  {
    type: "chat" as const,
    icon: MessageSquare,
    title: "Chat Consultation",
    description: "Text-based sessions for flexible, async communication.",
  },
  {
    type: "in_person" as const,
    icon: Stethoscope,
    title: "In-Person Visit",
    description: "Face-to-face appointments at the doctor's clinic.",
  },
];

export function DoctorProfileClient({ doctor, availabilitySlots }: DoctorProfileClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const card = mapToDoctorCard(doctor);

  const [showBooking, setShowBooking] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isPatient, setIsPatient] = useState(false);

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

  useEffect(() => {
    if (searchParams.get("book") === "true" && authChecked) {
      if (isPatient) {
        setShowBooking(true);
      }
    }
  }, [searchParams, authChecked, isPatient]);

  const handleBookClick = () => {
    if (!authChecked) return;

    if (!isPatient) {
      const redirect = `/doctors/${doctor.id}?book=true`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}&role=patient`);
      return;
    }

    setShowBooking(true);
  };

  const scheduleByDay = availabilitySlots.reduce<
    Record<number, { start_time: string; end_time: string }[]>
  >((acc, slot) => {
    const list = acc[slot.day_of_week] ?? [];
    list.push({ start_time: slot.start_time, end_time: slot.end_time });
    acc[slot.day_of_week] = list;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <Link
        href="/doctors"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all doctors
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-brand-500 to-brand-300 px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <UserAvatar
              name={card.name}
              avatarUrl={card.avatarUrl}
              size="xl"
              ring
              className="h-24 w-24 border-4 border-white text-2xl shadow-lg"
            />
            <div className="flex-1 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{card.name}</h1>
                <CheckCircle className="h-5 w-5 fill-white/20 text-white" />
              </div>
              <p className="mt-1 text-brand-50">{card.specialization}</p>
              {doctor.sub_specialization && (
                <p className="text-sm text-brand-50/80">{doctor.sub_specialization}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-brand-50">
                {card.rating > 0 && (
                  <span className="flex items-center gap-1 font-semibold">
                    <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                    {card.rating.toFixed(1)} ({card.reviewsCount} reviews)
                  </span>
                )}
                <span>{card.experience}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {card.city}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right text-white">
              <p className="text-xs uppercase tracking-wider text-brand-50">Consultation fee</p>
              <p className="text-3xl font-bold">{card.consultationFee}</p>
              {doctor.follow_up_fee && (
                <p className="mt-1 text-sm text-brand-50">
                  Follow-up: PKR {Number(doctor.follow_up_fee).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="text-lg font-bold text-slate-900">About</h2>
              <p className="mt-3 leading-relaxed text-slate-600">
                {doctor.bio ||
                  `${card.name} is a ${card.specialization.toLowerCase()} with ${doctor.experience_years} years of experience, registered with PMDC (${doctor.pmdc_number}).`}
              </p>
              {doctor.qualification?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {doctor.qualification.map((q) => (
                    <span
                      key={q}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Services Offered</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {SERVICES.map((service) => {
                  const Icon = service.icon;
                  return (
                    <div
                      key={service.type}
                      className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-100 hover:bg-brand-50/30"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-3 font-semibold text-slate-900">{service.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {service.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {doctor.hospital_affiliations && doctor.hospital_affiliations.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900">Hospital Affiliations</h2>
                <ul className="mt-3 space-y-2">
                  {doctor.hospital_affiliations.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-brand-500" />
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
              <h3 className="font-bold text-slate-900">Book a Consultation</h3>
              <p className="mt-2 text-sm text-slate-500">
                Choose a date and time that works for you. New patients can sign up in under a
                minute.
              </p>
              <Button
                className="mt-4 w-full bg-brand-500 font-semibold text-white hover:bg-brand-600"
                onClick={handleBookClick}
              >
                Book a Slot
              </Button>
              {!isPatient && authChecked && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Already have an account?{" "}
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/doctors/${doctor.id}?book=true`)}&role=patient`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Log in
                  </Link>
                  {" · "}
                  <Link
                    href={`/register?redirect=${encodeURIComponent(`/doctors/${doctor.id}?book=true`)}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 font-bold text-slate-900">
                <Clock className="h-4 w-4 text-brand-500" />
                Weekly Schedule
              </h3>
              {Object.keys(scheduleByDay).length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {Object.entries(scheduleByDay)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([day, slots]) => (
                      <li key={day} className="text-sm">
                        <span className="font-medium text-slate-900">
                          {DAY_LABELS[Number(day)]}
                        </span>
                        <div className="mt-0.5 text-slate-500">
                          {slots.map((s, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              {formatSlotRange(s.start_time, s.end_time)}
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Flexible scheduling — pick any available time when booking.
                </p>
              )}
            </div>

            {doctor.languages && doctor.languages.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="flex items-center gap-2 font-bold text-slate-900">
                  <Languages className="h-4 w-4 text-brand-500" />
                  Languages
                </h3>
                <p className="mt-2 text-sm text-slate-600">{doctor.languages.join(", ")}</p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">PMDC:</span> {doctor.pmdc_number}
              </p>
              {doctor.cities && doctor.cities.length > 1 && (
                <p className="mt-2">
                  <span className="font-medium text-slate-900">Cities:</span>{" "}
                  {doctor.cities.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showBooking && isPatient && (
        <BookingModal
          doctor={card}
          onClose={() => setShowBooking(false)}
          onSuccess={() => {
            setShowBooking(false);
            router.push("/patient/appointments");
          }}
        />
      )}
    </div>
  );
}
