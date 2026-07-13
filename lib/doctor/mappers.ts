import type { AppointmentStatus, AppointmentType, Gender } from "@/types";
import type { AppointmentWithPatient } from "./types";
import { parseClinicalNotes } from "./notes";
import {
  getAppointmentSessionTiming,
  mapTimingToDisplayStatus,
  type AppointmentSessionTiming,
} from "@/lib/appointments/session-timing";

export interface UIPatient {
  id: string;
  name: string;
  age: string;
  gender: string;
  city: string;
  phone: string;
  email: string;
  lastConsultation: string;
  sessionsCompleted: number;
  condition: string;
  prescriptions: Array<{ id: string; date: string; medication: string; dosage: string }>;
  sessionHistory: Array<{ id: string; date: string; type: string; notes: string }>;
  documents: Array<{ id: string; name: string; date: string; size: string }>;
}

export function mapPatientsFromAppointments(
  appointments: AppointmentWithPatient[]
): UIPatient[] {
  const byPatient = new Map<string, AppointmentWithPatient[]>();

  for (const apt of appointments) {
    if (!apt.patient) continue;
    const list = byPatient.get(apt.patient_id) ?? [];
    list.push(apt);
    byPatient.set(apt.patient_id, list);
  }

  return Array.from(byPatient.entries()).map(([patientId, patientAppointments]) => {
    const sorted = [...patientAppointments].sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    );
    const latest = sorted[0];
    const patient = latest.patient!;
    const completed = sorted.filter((apt) => apt.status === "completed");

    const prescriptions = completed
      .map((apt) => {
        const parsed = parseClinicalNotes(apt.doctor_notes);
        if (!parsed.prescription) return null;
        return {
          id: apt.id,
          date: formatDate(apt.completed_at ?? apt.scheduled_at),
          medication: parsed.prescription.medication,
          dosage: parsed.prescription.dosage,
        };
      })
      .filter(Boolean) as UIPatient["prescriptions"];

    const sessionHistory = completed.map((apt) => {
      const parsed = parseClinicalNotes(apt.doctor_notes);
      return {
        id: apt.id,
        date: formatDate(apt.completed_at ?? apt.scheduled_at),
        type: mapAppointmentType(apt.appointment_type),
        notes: parsed.clinicalNote || apt.patient_notes || "No notes recorded",
      };
    });

    const documents = completed
      .filter((apt) => apt.prescription_url)
      .map((apt) => ({
        id: apt.id,
        name: apt.prescription_url!.split("/").pop() ?? "Prescription",
        date: formatDate(apt.completed_at ?? apt.scheduled_at),
        size: "—",
      }));

    return {
      id: patientId,
      name: patient.full_name,
      age: calcAge(patient.date_of_birth) ? `${calcAge(patient.date_of_birth)} years` : "—",
      gender: formatGender(patient.gender),
      city: patient.city ?? "—",
      phone: patient.phone ?? "—",
      email: patient.email,
      lastConsultation: completed[0]
        ? formatDate(completed[0].completed_at ?? completed[0].scheduled_at)
        : "No consultations yet",
      sessionsCompleted: completed.length,
      condition: latest.patient_notes?.trim() || "General mental health",
      prescriptions,
      sessionHistory,
      documents,
    };
  });
}


const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calcAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function formatGender(gender: Gender | null): string {
  if (!gender) return "Not specified";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("en-PK", options ?? {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: string | Date): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatTimeRange(scheduledAt: string, durationMinutes: number): string {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatCurrency(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

export function mapAppointmentType(type: AppointmentType): string {
  const map: Record<AppointmentType, string> = {
    video: "Video",
    chat: "Chat",
    in_person: "In-Person",
  };
  return map[type] ?? type;
}

export function mapStatusToUI(
  status: AppointmentStatus,
  scheduledAt: string,
  durationMinutes = 30
): string {
  const timing = getAppointmentSessionTiming({
    scheduledAt,
    durationMinutes,
    status,
  });
  return mapTimingToDisplayStatus(status, timing);
}

export function mapStatusToDb(status: string): AppointmentStatus {
  const map: Record<string, AppointmentStatus> = {
    Confirmed: "scheduled",
    Pending: "scheduled",
    Ready: "ongoing",
    Completed: "completed",
    Cancelled: "cancelled",
    "No Show": "no_show",
    "Expired / No Show": "expired_no_show",
    Expired: "expired_no_show",
  };
  return map[status] ?? "scheduled";
}

export function mapAppointmentTypeToDb(type: string): AppointmentType {
  const map: Record<string, AppointmentType> = {
    Video: "video",
    Chat: "chat",
    Audio: "chat",
    "In-Person": "in_person",
  };
  return map[type] ?? "video";
}

export function dayNameToIndex(day: string): number {
  const index = DAY_NAMES.indexOf(day);
  return index >= 0 ? index : 0;
}

export function indexToDayName(index: number): string {
  return DAY_NAMES[index] ?? "Sunday";
}

export function time12To24(time12: string): string {
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "09:00:00";
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}:00`;
}

export function time24To12(time24: string): string {
  const [hoursStr, minutesStr] = time24.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr?.slice(0, 2) ?? "00";
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

export function formatSlotRange(startTime: string, endTime: string): string {
  return `${time24To12(startTime)} - ${time24To12(endTime)}`;
}

export function timeAgo(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function isToday(date: string): boolean {
  const value = new Date(date);
  const today = new Date();
  return (
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() &&
    value.getDate() === today.getDate()
  );
}

export function isSameDay(a: string, b: string): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export interface DashboardSession {
  id: string;
  patientName: string;
  patientAvatarUrl: string | null;
  time: string;
  type: string;
  status: string;
  rawStatus: AppointmentStatus;
  timing: AppointmentSessionTiming;
  canStartCall: boolean;
  canJoin: boolean;
  initials: string;
  patientAge: number | null;
  patientGender: string;
  lastVisit: string;
  notes: string;
  completed: boolean;
  prescription: { medication: string; dosage: string } | null;
  videoRoomUrl: string | null;
  scheduledAt: string;
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function mapToUIAppointment(appointment: AppointmentWithPatient) {
  const patientName = appointment.patient?.full_name ?? "Unknown Patient";
  const parsed = parseClinicalNotes(appointment.doctor_notes);
  const scheduled = new Date(appointment.scheduled_at);

  return {
    id: appointment.id,
    patientId: appointment.patient_id,
    patientName,
    patientEmail: appointment.patient?.email ?? "",
    patientPhone: appointment.patient?.phone ?? "",
    patientAge: calcAge(appointment.patient?.date_of_birth ?? null)?.toString() ?? "—",
    patientGender: formatGender(appointment.patient?.gender ?? null),
    date: toLocalDateKey(scheduled),
    time: `${scheduled.getHours().toString().padStart(2, "0")}:${scheduled.getMinutes().toString().padStart(2, "0")}`,
    duration: `${appointment.duration_minutes} min`,
    type: mapAppointmentType(appointment.appointment_type) as "Video" | "Audio" | "Chat",
    status: mapStatusToUI(appointment.status, appointment.scheduled_at, appointment.duration_minutes) as
      | "Confirmed"
      | "Pending"
      | "Completed"
      | "Cancelled"
      | "No Show",
    reason: appointment.patient_notes?.trim() || "General consultation",
    notes: parsed.clinicalNote,
    // In-app secure video page (issues per-user Jitsi tokens server-side).
    roomUrl: `/video/${appointment.id}`,
    prescription: parsed.prescription,
    createdAt: appointment.created_at,
  };
}

export function mapToDashboardSession(
  appointment: AppointmentWithPatient,
  lastVisitByPatient: Record<string, string>
): DashboardSession {
  const patientName = appointment.patient?.full_name ?? "Unknown Patient";
  const parsed = parseClinicalNotes(appointment.doctor_notes);
  const patientId = appointment.patient_id;

  const timing = getAppointmentSessionTiming({
    scheduledAt: appointment.scheduled_at,
    durationMinutes: appointment.duration_minutes,
    status: appointment.status,
  });

  return {
    id: appointment.id,
    patientName,
    patientAvatarUrl: appointment.patient?.avatar_url ?? null,
    time: formatTimeRange(appointment.scheduled_at, appointment.duration_minutes),
    type: appointment.patient_notes?.trim() || mapAppointmentType(appointment.appointment_type),
    status: mapTimingToDisplayStatus(appointment.status, timing),
    rawStatus: appointment.status,
    timing,
    canStartCall:
      timing.canStartCall &&
      appointment.status === "scheduled",
    canJoin:
      timing.canJoin &&
      ["scheduled", "ongoing"].includes(appointment.status),
    initials: getInitials(patientName),
    patientAge: calcAge(appointment.patient?.date_of_birth ?? null),
    patientGender: formatGender(appointment.patient?.gender ?? null),
    lastVisit: lastVisitByPatient[patientId] ?? "First visit",
    notes: parsed.clinicalNote,
    completed:
      appointment.status === "completed" ||
      appointment.status === "expired_no_show",
    prescription: parsed.prescription,
    videoRoomUrl: appointment.video_room_url,
    scheduledAt: appointment.scheduled_at,
  };
}
