import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountStatus, DoctorStatus, Profile, UserRole } from "@/types";

export interface AccountAccessResult {
  profile: Profile | null;
  doctorStatus: DoctorStatus | null;
  canAccessDashboard: boolean;
  pendingReview: boolean;
  rejected: boolean;
  message: string;
}

export function resolveDashboardPath(role: UserRole): string {
  if (role === "admin" || role === "super_admin") return "/admin/dashboard";
  if (role === "doctor") return "/doctor/dashboard";
  return "/patient/dashboard";
}

export function evaluateAccountAccess(
  profile: Profile | null,
  doctorStatus: DoctorStatus | null = null
): AccountAccessResult {
  if (!profile) {
    return {
      profile: null,
      doctorStatus: null,
      canAccessDashboard: false,
      pendingReview: false,
      rejected: false,
      message: "We couldn't verify your account. Please contact support.",
    };
  }

  if (profile.account_status === "rejected") {
    return {
      profile,
      doctorStatus,
      canAccessDashboard: false,
      pendingReview: false,
      rejected: true,
      message:
        profile.rejection_reason ??
        "Your account application was not approved. Please contact support@stresssaviors.pk for help.",
    };
  }

  if (profile.account_status === "pending") {
    return {
      profile,
      doctorStatus,
      canAccessDashboard: false,
      pendingReview: true,
      rejected: false,
      message:
        profile.role === "doctor"
          ? "Your doctor application is pending review. An administrator will verify your credentials before you can access the dashboard."
          : "Your account is pending review. An administrator will approve your registration before you can access the dashboard.",
    };
  }

  if (!profile.is_active) {
    return {
      profile,
      doctorStatus,
      canAccessDashboard: false,
      pendingReview: false,
      rejected: true,
      message: "Your account has been deactivated. Please contact support@stresssaviors.pk.",
    };
  }

  if (profile.role === "doctor") {
    if (doctorStatus === "rejected") {
      return {
        profile,
        doctorStatus,
        canAccessDashboard: false,
        pendingReview: false,
        rejected: true,
        message:
          "Your doctor application was not approved. Please contact support@stresssaviors.pk for more information.",
      };
    }

    if (doctorStatus !== "approved") {
      return {
        profile,
        doctorStatus,
        canAccessDashboard: false,
        pendingReview: true,
        rejected: false,
        message:
          "Your doctor profile is pending verification. You'll get dashboard access once an administrator approves your application.",
      };
    }
  }

  return {
    profile,
    doctorStatus,
    canAccessDashboard: true,
    pendingReview: false,
    rejected: false,
    message: "",
  };
}

export async function getAccountAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountAccessResult> {
  const { data: profileRow, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profileRow) {
    return evaluateAccountAccess(null);
  }

  const profile = profileRow as Profile;
  let doctorStatus: DoctorStatus | null = null;

  if (profile.role === "doctor") {
    const { data: doctorProfile } = await supabase
      .from("doctor_profiles")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    doctorStatus = (doctorProfile as { status?: DoctorStatus } | null)?.status ?? null;
  }

  return evaluateAccountAccess(profile, doctorStatus);
}

export function isApprovedAccount(profile: Profile): boolean {
  return profile.account_status === ("approved" satisfies AccountStatus) && profile.is_active;
}
