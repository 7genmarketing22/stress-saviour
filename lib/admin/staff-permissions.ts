import type { AdminPermissions } from "@/types";

export const PERMISSION_KEYS = [
  "can_approve_doctors",
  "can_reject_doctors",
  "can_view_payments",
  "can_refund_payments",
  "can_manage_patients",
  "can_view_reports",
  "can_send_notifications",
  "can_manage_staff",
] as const satisfies readonly (keyof AdminPermissions)[];

export const PERMISSION_LABELS: Record<keyof AdminPermissions, string> = {
  can_approve_doctors: "Approve doctors",
  can_reject_doctors: "Reject / suspend doctors",
  can_view_payments: "View payments & payouts",
  can_refund_payments: "Refund payments",
  can_manage_patients: "Manage patient accounts",
  can_view_reports: "View reports & analytics",
  can_send_notifications: "Send notifications",
  can_manage_staff: "Manage staff & permissions",
};

export const ALL_PERMISSIONS: AdminPermissions = {
  can_approve_doctors: true,
  can_reject_doctors: true,
  can_view_payments: true,
  can_refund_payments: true,
  can_manage_patients: true,
  can_view_reports: true,
  can_send_notifications: true,
  can_manage_staff: true,
};

export const NO_PERMISSIONS: AdminPermissions = {
  can_approve_doctors: false,
  can_reject_doctors: false,
  can_view_payments: false,
  can_refund_payments: false,
  can_manage_patients: false,
  can_view_reports: false,
  can_send_notifications: false,
  can_manage_staff: false,
};

export type StaffAccessPreset = "full" | "operations" | "finance" | "support" | "custom";

export const STAFF_ACCESS_PRESETS: Record<
  Exclude<StaffAccessPreset, "custom">,
  { label: string; description: string; permissions: AdminPermissions }
> = {
  full: {
    label: "Full access",
    description: "All platform areas including staff management",
    permissions: ALL_PERMISSIONS,
  },
  operations: {
    label: "Operations",
    description: "Doctors, patients, appointments, and reports",
    permissions: {
      ...NO_PERMISSIONS,
      can_approve_doctors: true,
      can_reject_doctors: true,
      can_manage_patients: true,
      can_view_reports: true,
      can_send_notifications: true,
    },
  },
  finance: {
    label: "Finance",
    description: "Payments, refunds, and financial reports",
    permissions: {
      ...NO_PERMISSIONS,
      can_view_payments: true,
      can_refund_payments: true,
      can_view_reports: true,
    },
  },
  support: {
    label: "Support",
    description: "Patient support, appointments, and messaging",
    permissions: {
      ...NO_PERMISSIONS,
      can_manage_patients: true,
      can_view_reports: true,
      can_send_notifications: true,
    },
  },
};

export const STAFF_PRESET_OPTIONS = (
  Object.entries(STAFF_ACCESS_PRESETS) as Array<
    [Exclude<StaffAccessPreset, "custom">, (typeof STAFF_ACCESS_PRESETS)[Exclude<StaffAccessPreset, "custom">]]
  >
).map(([value, preset]) => ({
  value,
  label: preset.label,
  description: preset.description,
}));

export function permissionsForRole(
  role: "admin" | "super_admin",
  preset: StaffAccessPreset,
  custom?: Partial<AdminPermissions>
): AdminPermissions {
  if (role === "super_admin") return ALL_PERMISSIONS;
  if (preset === "custom") {
    return { ...NO_PERMISSIONS, ...custom };
  }
  return STAFF_ACCESS_PRESETS[preset].permissions;
}

export function countEnabledPermissions(permissions: AdminPermissions): number {
  return PERMISSION_KEYS.filter((key) => permissions[key]).length;
}

export function hasAllPermissions(permissions: AdminPermissions): boolean {
  return PERMISSION_KEYS.every((key) => permissions[key]);
}

export function inferAccessPreset(permissions: AdminPermissions): StaffAccessPreset {
  if (hasAllPermissions(permissions)) return "full";
  for (const key of ["operations", "finance", "support"] as const) {
    const preset = STAFF_ACCESS_PRESETS[key];
    if (PERMISSION_KEYS.every((perm) => permissions[perm] === preset.permissions[perm])) {
      return key;
    }
  }
  return "custom";
}

export function normalizePermissions(value: unknown): AdminPermissions {
  const source = (value ?? {}) as Partial<AdminPermissions>;
  return {
    can_approve_doctors: Boolean(source.can_approve_doctors),
    can_reject_doctors: Boolean(source.can_reject_doctors),
    can_view_payments: Boolean(source.can_view_payments),
    can_refund_payments: Boolean(source.can_refund_payments),
    can_manage_patients: Boolean(source.can_manage_patients),
    can_view_reports: Boolean(source.can_view_reports),
    can_send_notifications: Boolean(source.can_send_notifications),
    can_manage_staff: Boolean(source.can_manage_staff),
  };
}
