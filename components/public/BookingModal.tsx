"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { bookAppointment, getDoctorAvailability, getBookedSlotsForDate } from "@/lib/patient/api";
import { generateTimeSlotsForDate } from "@/lib/booking/slots";
import type { AppointmentType } from "@/types";

export interface BookingDoctorInfo {
  id: string;
  name: string;
  consultationFee: string;
  consultationFeeRaw: number;
}

interface BookingModalProps {
  doctor: BookingDoctorInfo;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({ doctor, onClose, onSuccess }: BookingModalProps) {
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const [bookDate, setBookDate] = useState(tomorrow);
  const [bookTime, setBookTime] = useState("10:00");
  const [bookType, setBookType] = useState<AppointmentType>("video");
  const [bookNotes, setBookNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<
    Awaited<ReturnType<typeof getDoctorAvailability>>
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [loadingBooked, setLoadingBooked] = useState(false);

  useEffect(() => {
    getDoctorAvailability(doctor.id)
      .then(setAvailabilitySlots)
      .catch(() => setAvailabilitySlots([]))
      .finally(() => setLoadingSlots(false));
  }, [doctor.id]);

  // Re-fetch booked slots whenever the selected date changes
  useEffect(() => {
    if (!bookDate) return;
    setLoadingBooked(true);
    getBookedSlotsForDate(doctor.id, bookDate)
      .then((result) => {
        setBookedSlots(result.booked);
        setBlockedSlots(result.blocked);
      })
      .catch(() => { setBookedSlots([]); setBlockedSlots([]); })
      .finally(() => setLoadingBooked(false));
  }, [doctor.id, bookDate]);

  const timeOptions = useMemo(() => {
    const generated = generateTimeSlotsForDate(availabilitySlots, bookDate);
    return generated.length > 0 ? generated : ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
  }, [availabilitySlots, bookDate]);

  useEffect(() => {
    const isUnavailable = bookedSlots.includes(bookTime) || blockedSlots.includes(bookTime);
    if (!timeOptions.includes(bookTime) || isUnavailable) {
      const firstFree = timeOptions.find(
        (t) => !bookedSlots.includes(t) && !blockedSlots.includes(t)
      );
      setBookTime(firstFree ?? timeOptions[0] ?? "10:00");
    }
  }, [timeOptions, bookedSlots, blockedSlots, bookTime]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBooking(true);
    setError(null);

    if (bookedSlots.includes(bookTime)) {
      setError("This slot is already booked. Please choose a different time.");
      setBooking(false);
      return;
    }
    if (blockedSlots.includes(bookTime)) {
      setError("This doctor is unavailable at the selected time. Please choose a different slot.");
      setBooking(false);
      return;
    }

    try {
      const scheduledAt = new Date(`${bookDate}T${bookTime}:00`).toISOString();
      await bookAppointment({
        doctorProfileId: doctor.id,
        scheduledAt,
        appointmentType: bookType,
        patientNotes: bookNotes,
        consultationFee: doctor.consultationFeeRaw,
        paymentMethod: "jazzcash",
      });
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to book appointment";
      setError(message);
      // If it was a race-condition collision, refresh booked slots so the
      // UI immediately reflects the newly-taken slot
      if (message.includes("just been booked") || message.includes("already booked") || message.includes("unavailable")) {
        getBookedSlotsForDate(doctor.id, bookDate)
          .then((result) => { setBookedSlots(result.booked); setBlockedSlots(result.blocked); })
          .catch(() => {});
      }
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Book Appointment</h3>
            <p className="text-xs text-slate-500">{doctor.name}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="space-y-4 p-6" onSubmit={handleBook}>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-4 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Time</label>
            {loadingSlots || loadingBooked ? (
              <div className="flex h-10 items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingSlots ? "Loading available slots…" : "Checking availability…"}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {timeOptions.map((time) => {
                  const isBooked = bookedSlots.includes(time);
                  const isBlocked = blockedSlots.includes(time);
                  const isUnavailable = isBooked || isBlocked;
                  const isSelected = bookTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => !isUnavailable && setBookTime(time)}
                      title={isBlocked ? "Doctor unavailable" : isBooked ? "Already booked" : undefined}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isBlocked
                          ? "cursor-not-allowed border-orange-100 bg-orange-50 text-orange-300 line-through"
                          : isBooked
                            ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through"
                            : isSelected
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-slate-200 text-slate-700 hover:border-brand-200"
                      }`}
                    >
                      {time}
                      {isBlocked && <span className="ml-1 text-[10px] normal-case no-underline">Off</span>}
                      {isBooked && !isBlocked && <span className="ml-1 text-[10px] normal-case no-underline">Booked</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Consultation Type
            </label>
            <select
              value={bookType}
              onChange={(e) => setBookType(e.target.value as AppointmentType)}
              className="h-10 w-full rounded-lg border border-slate-200 px-4 text-sm"
            >
              <option value="video">Video Consultation</option>
              <option value="chat">Chat Consultation</option>
              <option value="in_person">In-Person Visit</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Reason / Notes
            </label>
            <textarea
              rows={3}
              value={bookNotes}
              onChange={(e) => setBookNotes(e.target.value)}
              placeholder="Briefly describe your concern..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Consultation fee: <strong>{doctor.consultationFee}</strong>. After booking, pay to the admin account and upload your payment screenshot from My Appointments to confirm.
          </p>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-brand-500 text-white hover:bg-brand-600"
              disabled={booking || loadingSlots}
            >
              {booking ? "Booking…" : "Confirm Booking"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
