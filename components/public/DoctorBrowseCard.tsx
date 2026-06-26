import Link from "next/link";
import { CheckCircle, MapPin, Star, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { mapToDoctorCard } from "@/lib/patient/mappers";

type DoctorCardData = ReturnType<typeof mapToDoctorCard>;

interface DoctorBrowseCardProps {
  doctor: DoctorCardData;
  showBookButton?: boolean;
  onBook?: () => void;
}

export function DoctorBrowseCard({ doctor, showBookButton = true, onBook }: DoctorBrowseCardProps) {
  return (
    <Card className="flex flex-col justify-between overflow-hidden border-slate-200/80 transition-all hover:border-teal-200 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <UserAvatar
            name={doctor.name}
            avatarUrl={doctor.avatarUrl}
            size="md"
            className="h-14 w-14 text-lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-bold text-base leading-none text-slate-900">
                {doctor.name}
              </h3>
              <CheckCircle className="h-4 w-4 shrink-0 fill-teal-500/10 text-teal-600" />
            </div>
            <p className="mt-1 text-xs font-medium text-teal-700">{doctor.specialization}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{doctor.qualification}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
          {doctor.rating > 0 && (
            <span className="flex items-center gap-0.5 font-semibold text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-500" />
              {doctor.rating.toFixed(1)}
            </span>
          )}
          <span>({doctor.reviewsCount} reviews)</span>
          <span>•</span>
          <span>{doctor.experience}</span>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>{doctor.city}, Pakistan</span>
          </div>
          {doctor.isAvailableToday && (
            <span className="font-medium text-emerald-600">Available for bookings</span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 pt-4">
        <div>
          <p className="text-[10px] uppercase text-slate-400">Consultation</p>
          <p className="text-sm font-bold text-slate-900">{doctor.consultationFee}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/doctors/${doctor.id}`}>
            <Button size="sm" variant="outline" className="gap-1 font-medium">
              View Profile
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          {showBookButton && onBook && (
            <Button
              size="sm"
              className="bg-teal-600 font-semibold text-white hover:bg-teal-700"
              onClick={onBook}
            >
              Book Slot
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
