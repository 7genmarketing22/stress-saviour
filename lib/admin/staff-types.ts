import type { AdminPermissions, Profile } from "@/types";

export interface AdminStaffRecord {
  id: string;
  user_id: string;
  created_by: string | null;
  permissions: AdminPermissions;
  is_active: boolean;
  created_at: string;
}

export interface AdminStaffMember extends Profile {
  staffRecord: AdminStaffRecord | null;
}
