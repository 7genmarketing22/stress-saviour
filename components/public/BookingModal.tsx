"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SlotTimePicker } from "@/components/booking/SlotTimePicker";
import { bookAppointment } from "@/lib/patient/api";
import { pkDateTimeToUtcIso } from "@/lib/booking/timezone";
import { getPkDateWithOffset, getPkTodayDate, isSlotInPast } from "@/lib/booking/slots";
import {
  isSlotSelectable,
  mapBookingErrorMessage,
  shouldRefreshSlotsAfterBookingError,
} from "@/lib/booking/slot-status";
import { useDoctorSlotAvailability } from "@/lib/hooks/useDoctorSlotAvailability";
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
  const tomorrow = useMemo(() => getPkDateWithOffset(1), []);

  const [bookDate, setBookDate] = useState(tomorrow);
  const [bookTime, setBookTime] = useState("10:00");
  const [bookType, setBookType] = useState<AppointmentType>("video");
  const [bookNotes, setBookNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    bookedSlots,
    blockedSlots,
    timeOptions,
    sessionDuration,
    loadingAvailability,
    loadingSlots,
    hasAvailabilityConfigured,
    refreshSlots,
    fetchSlotsNow,
    findFirstAvailable,
  } = useDoctorSlotAvailability({
    doctorId: doctor.id,
    date: bookDate,
  });

  useEffect(() => {
    const firstFree = findFirstAvailable();
    if (firstFree) {
      if (
        !timeOptions.includes(bookTime) ||
        !isSlotSelectable(bookTime, bookedSlots, blockedSlots)
      ) {
        setBookTime(firstFree);
      }
      return;
    }
    if (timeOptions.length > 0) {
      setBookTime(timeOptions[0]);
    }
  }, [timeOptions, bookedSlots, blockedSlots, bookTime, findFirstAvailable]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBooking(true);
    setError(null);

    if (!hasAvailabilityConfigured || timeOptions.length === 0) {
      setError("This doctor has no bookable slots for the selected date.");
      setBooking(false);
      return;
    }

    const latest = await fetchSlotsNow();
    if (
      isSlotInPast(bookDate, bookTime) ||
      !isSlotSelectable(bookTime, latest.booked, latest.blocked)
    ) {
      setError("This slot is no longer available. Please choose a different time.");
      setBooking(false);
      return;
    }

    try {
      const scheduledAt = pkDateTimeToUtcIso(bookDate, bookTime);
      await bookAppointment({
        doctorProfileId: doctor.id,
        scheduledAt,
        appointmentType: bookType,
        patientNotes: bookNotes,
        consultationFee: doctor.consultationFeeRaw,
        durationMinutes: sessionDuration,
        paymentMethod: "jazzcash",
      });
      onSuccess();
    } catch (err) {
      const message = mapBookingErrorMessage(err);
      setError(message);
      if (shouldRefreshSlotsAfterBookingError(message)) {
        refreshSlots();
      }
    } finally {
      setBooking(false);
    }
  };

  const slotsLoading = loadingAvailability || loadingSlots;

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
                min={getPkTodayDate()}
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-4 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Time</label>
            <SlotTimePicker
              timeOptions={timeOptions}
              bookedSlots={bookedSlots}
              blockedSlots={blockedSlots}
              selectedTime={bookTime}
              onSelect={setBookTime}
              loading={slotsLoading}
            />
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

          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Consultation fee: <strong>{doctor.consultationFee}</strong>. After booking, pay to the
            admin account and upload your payment screenshot from My Appointments to confirm.
          </p>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-brand-500 text-white hover:bg-brand-600"
              disabled={
                booking ||
                slotsLoading ||
                !hasAvailabilityConfigured ||
                timeOptions.length === 0 ||
                !isSlotSelectable(bookTime, bookedSlots, blockedSlots)
              }
            >
              {booking ? "Booking…" : "Confirm Booking"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
