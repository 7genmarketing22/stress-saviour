import Link from "next/link";
import {
  Award,
  CheckCircle,
  MapPin,
  MessageSquare,
  Star,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { mapToDoctorCard } from "@/lib/patient/mappers";

type DoctorCardData = ReturnType<typeof mapToDoctorCard>;

interface DoctorListCardProps {
  doctor: DoctorCardData;
  rank?: number;
  onBookVideo?: () => void;
  onBookAppointment?: () => void;
}

const CONDITION_TAGS = [
  "Anxiety",
  "Depression",
  "Stress",
  "Sleep Issues",
  "PTSD",
  "Burnout",
];

export function DoctorListCard({
  doctor,
  rank,
  onBookVideo,
  onBookAppointment,
}: DoctorListCardProps) {
  const satisfaction =
    doctor.rating > 0 ? Math.round((doctor.rating / 5) * 100) : null;
  const tags = CONDITION_TAGS.slice(0, 4);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-teal-200 hover:shadow-md">
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: profile */}
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="relative shrink-0">
            <UserAvatar
              name={doctor.name}
              avatarUrl={doctor.avatarUrl}
              size="lg"
              className="h-20 w-20 text-xl"
            />
            {rank && rank <= 3 && (
              <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white shadow">
                {rank}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/doctors/${doctor.id}`}
                  className="text-lg font-bold text-slate-900 hover:text-teal-700 hover:underline"
                >
                  {doctor.name}
                </Link>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  <CheckCircle className="h-3 w-3" />
                  PMDC Verified
                </span>
              </div>
              <p className="mt-0.5 text-sm font-semibold text-teal-700">
                {doctor.specialization}
              </p>
              <p className="line-clamp-2 text-xs text-slate-500">{doctor.qualification}</p>
            </div>

            {doctor.rating >= 4 && doctor.reviewsCount >= 3 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-800">
                <Award className="h-3 w-3" />
                Top Booked Doctor
              </span>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 sm:max-w-sm">
              <Stat label="Reviews" value={String(doctor.reviewsCount)} />
              <Stat
                label="Experience"
                value={`${doctor.experience.replace(" years experience", "")} Yrs`}
              />
              <Stat
                label="Satisfaction"
                value={satisfaction ? `${satisfaction}%` : "—"}
              />
            </div>

            {/* Condition tags */}
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: CTAs */}
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:min-w-[180px]">
          <Button
            className="h-11 gap-2 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            onClick={onBookVideo}
          >
            <Video className="h-4 w-4" />
            Book Video Call
          </Button>
          <Button
            className="h-11 gap-2 rounded-xl bg-[#1e3a5f] font-semibold text-white hover:bg-[#152a45]"
            onClick={onBookAppointment}
          >
            <MessageSquare className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Fee cards row */}
      <div className="grid gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-white p-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700">
              Video Consultation
            </p>
            <p className="text-lg font-bold text-slate-900">{doctor.consultationFee}</p>
            <p className="text-[11px] text-emerald-600 font-medium">
              {doctor.isAvailableToday ? "Available for booking" : "Check schedule"}
            </p>
          </div>
          <span className="rounded-lg bg-teal-100 px-2 py-1 text-[10px] font-bold text-teal-800">
            Online
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              In-Clinic Visit
            </p>
            <p className="text-lg font-bold text-slate-900">{doctor.consultationFee}</p>
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="h-3 w-3" />
              {doctor.city}, Pakistan
            </p>
          </div>
          <Link href={`/doctors/${doctor.id}`}>
            <Button size="sm" variant="outline" className="text-xs font-semibold">
              View Profile
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function DoctorGridCard({
  doctor,
  onBook,
}: {
  doctor: DoctorCardData;
  onBook?: () => void;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-teal-200 hover:shadow-lg">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <UserAvatar name={doctor.name} avatarUrl={doctor.avatarUrl} size="md" className="h-14 w-14" />
          <div className="min-w-0">
            <Link href={`/doctors/${doctor.id}`} className="font-bold text-slate-900 hover:text-teal-700">
              {doctor.name}
            </Link>
            <p className="text-xs font-semibold text-teal-700">{doctor.specialization}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              {doctor.rating > 0 && (
                <span className="flex items-center gap-0.5 font-semibold text-amber-500">
                  <Star className="h-3 w-3 fill-amber-500" />
                  {doctor.rating.toFixed(1)}
                </span>
              )}
              <span>{doctor.experience}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold text-slate-900">{doctor.consultationFee}</p>
        <p className="text-xs text-slate-500">{doctor.city}</p>
      </div>
      <div className="mt-auto flex gap-2 border-t border-slate-100 bg-slate-50/50 p-3">
        <Link href={`/doctors/${doctor.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-xs">
            View Profile
          </Button>
        </Link>
        {onBook && (
          <Button
            size="sm"
            className="flex-1 bg-teal-600 text-xs text-white hover:bg-teal-700"
            onClick={onBook}
          >
            Book Slot
          </Button>
        )}
      </div>
    </article>
  );
}
