"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBookedSlotsForDate, getDoctorAvailability } from "@/lib/patient/api";
import {
  filterPastSlotsForToday,
  generateTimeSlotsForDate,
  getSessionDurationForDate,
} from "@/lib/booking/slots";
import { findFirstAvailableSlot } from "@/lib/booking/slot-status";
import { useAppointmentSlotsRealtime } from "@/lib/realtime/useAppointmentSlotsRealtime";

interface Options {
  doctorId: string;
  date: string;
  enabled?: boolean;
}

export function useDoctorSlotAvailability({
  doctorId,
  date,
  enabled = true,
}: Options) {
  const [availabilitySlots, setAvailabilitySlots] = useState<
    Awaited<ReturnType<typeof getDoctorAvailability>>
  >([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const sessionDuration = useMemo(
    () =>
      date
        ? getSessionDurationForDate(availabilitySlots, date)
        : 30,
    [availabilitySlots, date],
  );

  // Re-evaluated every minute so past slots drop off while the picker stays open.
  const [clockTick, setClockTick] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setClockTick(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [enabled]);

  const timeOptions = useMemo(() => {
    if (!date || availabilitySlots.length === 0) return [];
    const all = generateTimeSlotsForDate(availabilitySlots, date, sessionDuration);
    return filterPastSlotsForToday(all, date, new Date(clockTick));
  }, [availabilitySlots, date, sessionDuration, clockTick]);

  const refreshSlots = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const fetchSlotsNow = useCallback(async () => {
    if (!doctorId || !date) {
      return { booked: [] as string[], blocked: [] as string[] };
    }
    const result = await getBookedSlotsForDate(doctorId, date);
    setBookedSlots(result.booked);
    setBlockedSlots(result.blocked);
    return result;
  }, [doctorId, date]);

  useEffect(() => {
    if (!enabled || !doctorId) return;
    setLoadingAvailability(true);
    getDoctorAvailability(doctorId)
      .then(setAvailabilitySlots)
      .catch(() => setAvailabilitySlots([]))
      .finally(() => setLoadingAvailability(false));
  }, [doctorId, enabled]);

  useEffect(() => {
    if (!enabled || !doctorId || !date) return;
    setLoadingSlots(true);
    getBookedSlotsForDate(doctorId, date)
      .then((result) => {
        setBookedSlots(result.booked);
        setBlockedSlots(result.blocked);
      })
      .catch(() => {
        setBookedSlots([]);
        setBlockedSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date, enabled, refreshKey]);

  useAppointmentSlotsRealtime({
    doctorId,
    onChange: refreshSlots,
    enabled: enabled && Boolean(doctorId),
  });

  const findFirstAvailable = useCallback(
    () => findFirstAvailableSlot(timeOptions, bookedSlots, blockedSlots),
    [timeOptions, bookedSlots, blockedSlots],
  );

  return {
    availabilitySlots,
    bookedSlots,
    blockedSlots,
    timeOptions,
    sessionDuration,
    loadingAvailability,
    loadingSlots,
    hasAvailabilityConfigured: availabilitySlots.length > 0,
    refreshSlots,
    fetchSlotsNow,
    findFirstAvailable,
  };
}
