import { createClient } from "@/lib/supabase/server";
import type { AdminPermissions, Profile, UserRole } from "@/types";
import type { Database, Json } from "@/types/database";
import { ALL_PERMISSIONS, permissionsForRole, type StaffAccessPreset, normalizePermissions } from "./staff-permissions";
import type { AdminStaffMember, AdminStaffRecord } from "./staff-types";

export type { AdminStaffMember, AdminStaffRecord } from "./staff-types";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, status: 401, message: "Not authenticated." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false as const, status: 403, message: "Admin profile not found." };
  }

  const typedProfile = profile as Profile;
  if (
    (typedProfile.role !== "admin" && typedProfile.role !== "super_admin") ||
    !typedProfile.is_active
  ) {
    return { ok: false as const, status: 403, message: "Admin access required." };
  }

  return { ok: true as const, profile: typedProfile, userId: user.id };
}

export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, status: 401, message: "Not authenticated." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false as const, status: 403, message: "Admin profile not found." };
  }

  const typedProfile = profile as Profile;
  if (typedProfile.role !== "super_admin" || !typedProfile.is_active) {
    return {
      ok: false as const,
      status: 403,
      message: "Only active super administrators can manage staff.",
    };
  }

  return { ok: true as const, profile: typedProfile, userId: user.id };
}

function permissionsToJson(permissions: AdminPermissions): Json {
  return permissions as unknown as Json;
}

function normalizeStaffPermissions(value: unknown): AdminPermissions {
  return normalizePermissions(value);
}

function adminTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: keyof Database["public"]["Tables"]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from(name) as any;
}

export async function listStaffMembers(): Promise<AdminStaffMember[]> {
  const supabase = await createClient();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["admin", "super_admin"])
    .order("created_at", { ascending: true });

  if (profilesError) throw profilesError;

  const { data: staffRows, error: staffError } = await supabase
    .from("admin_staff")
    .select("*");

  if (staffError) throw staffError;

  type StaffRow = Database["public"]["Tables"]["admin_staff"]["Row"];
  const rows = (staffRows ?? []) as StaffRow[];

  const staffByUser = new Map(
    rows.map((row) => [
      row.user_id,
      {
        ...row,
        permissions: normalizeStaffPermissions(row.permissions),
      } satisfies AdminStaffRecord,
    ])
  );

  return ((profiles ?? []) as Profile[]).map((profile) => ({
    ...profile,
    staffRecord: staffByUser.get(profile.id) ?? null,
  }));
}

export async function createStaffMember(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: "admin" | "super_admin";
  accessPreset: StaffAccessPreset;
  permissions?: Partial<AdminPermissions>;
  createdBy: string;
}) {
  const supabase = await createClient();
  const permissions = permissionsForRole(input.role, input.accessPreset, input.permissions);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("provision_staff_member", {
    p_email: input.email.trim().toLowerCase(),
    p_password: input.password,
    p_full_name: input.fullName.trim(),
    p_phone: input.phone?.trim() ?? "",
    p_role: input.role,
    p_permissions: permissionsToJson(permissions),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Failed to create staff member.");
  }

  return data as string;
}

export async function updateStaffMember(input: {
  userId: string;
  fullName?: string;
  phone?: string | null;
  role?: Extract<UserRole, "admin" | "super_admin">;
  isActive?: boolean;
  accessPreset?: StaffAccessPreset;
  permissions?: Partial<AdminPermissions>;
}) {
  const supabase = await createClient();

  const { data: existingProfile, error: fetchError } = await adminTable(supabase, "profiles")
    .select("role")
    .eq("id", input.userId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existingProfile) throw new Error("Staff member not found.");

  const currentRole = (existingProfile as { role: UserRole }).role as "admin" | "super_admin";
  const nextRole = input.role ?? currentRole;

  const profileUpdates: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (input.fullName !== undefined) profileUpdates.full_name = input.fullName.trim();
  if (input.phone !== undefined) profileUpdates.phone = input.phone;
  if (input.role !== undefined) profileUpdates.role = input.role;
  if (input.isActive !== undefined) profileUpdates.is_active = input.isActive;

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await adminTable(supabase, "profiles")
      .update(profileUpdates)
      .eq("id", input.userId);
    if (error) throw error;
  }

  const permissions =
    input.accessPreset !== undefined || input.permissions !== undefined
      ? permissionsForRole(nextRole, input.accessPreset ?? "custom", input.permissions)
      : input.role === "super_admin"
        ? ALL_PERMISSIONS
        : undefined;

  const staffUpdates: Database["public"]["Tables"]["admin_staff"]["Update"] = {};
  if (permissions) staffUpdates.permissions = permissionsToJson(permissions);
  if (input.isActive !== undefined) staffUpdates.is_active = input.isActive;

  if (Object.keys(staffUpdates).length > 0) {
    const { error } = await adminTable(supabase, "admin_staff")
      .update(staffUpdates)
      .eq("user_id", input.userId);
    if (error) throw error;
  }

  if (nextRole === "super_admin" && permissions === undefined && input.role === "super_admin") {
    const { error } = await adminTable(supabase, "admin_staff").upsert(
      {
        user_id: input.userId,
        permissions: permissionsToJson(ALL_PERMISSIONS),
        is_active: input.isActive ?? true,
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;
  }
}
