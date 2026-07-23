import type { AppNotification } from "@/lib/notifications/api";

export type PortalRole = "patient" | "doctor" | "admin";

const DASHBOARD: Record<PortalRole, string> = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  admin: "/admin/dashboard",
};

/**
 * Role-specific destinations for every in-app notification type.
 * Every portal always gets a concrete href (never null for known roles).
 */
const BY_TYPE: Record<string, Record<PortalRole, string>> = {
  appointment: {
    patient: "/patient/appointments",
    doctor: "/doctor/appointments",
    admin: "/admin/appointments",
  },
  payment: {
    patient: "/patient/payments",
    doctor: "/doctor/earnings",
    admin: "/admin/payments",
  },
  payout: {
    patient: "/patient/payments",
    doctor: "/doctor/earnings",
    admin: "/admin/payments",
  },
  approval: {
    patient: "/patient/dashboard",
    doctor: "/doctor/profile",
    admin: "/admin/doctors",
  },
  chat: {
    patient: "/patient/chat",
    doctor: "/doctor/chat",
    admin: "/admin/chat",
  },
  assessment: {
    patient: "/patient/assessments",
    doctor: "/doctor/assessments",
    admin: "/admin/patients",
  },
  system: {
    patient: "/patient/dashboard",
    doctor: "/doctor/dashboard",
    admin: "/admin/dashboard",
  },
};

export function asPortalRole(role: string): PortalRole {
  if (role === "doctor" || role === "admin" || role === "patient") return role;
  if (role === "super_admin") return "admin";
  return "patient";
}

function isAssessmentNotification(
  type: string | null | undefined,
  metadata: Record<string, unknown>,
  title?: string
): boolean {
  if (type === "assessment") return true;
  if (metadata.assessment_id || metadata.share_id) return true;
  const t = (title ?? "").toLowerCase();
  return (
    t.includes("health assessment") ||
    t.includes("assessment reviewed") ||
    (t.includes("shared") && t.includes("assessment"))
  );
}

/** Resolve destination from type / metadata / role (usable on server for push URLs). */
export function resolveNotificationPath(
  type: string | null | undefined,
  role: string,
  metadata?: Record<string, unknown> | null,
  title?: string
): string {
  const portal = asPortalRole(role);
  const m = (metadata ?? {}) as Record<string, unknown>;

  if (isAssessmentNotification(type, m, title)) {
    return BY_TYPE.assessment[portal];
  }

  if (type === "system" && portal === "admin") {
    if (m.role === "doctor") return "/admin/doctors";
    if (m.role === "patient") return "/admin/patients";
    return "/admin/dashboard";
  }

  const byRole = type ? BY_TYPE[type] : undefined;
  if (byRole) return byRole[portal];

  return DASHBOARD[portal];
}

/**
 * Resolve the in-portal URL for a notification for doctor / admin / patient.
 * Always returns a path for those roles so clicks never dead-end.
 */
export function notificationHref(
  n: AppNotification,
  role: string
): string {
  return resolveNotificationPath(n.type, role, n.metadata, n.title);
}
