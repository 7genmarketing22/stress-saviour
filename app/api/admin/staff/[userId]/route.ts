import { NextResponse } from "next/server";
import {
  listStaffMembers,
  requireSuperAdmin,
  updateStaffMember,
} from "@/lib/admin/staff-server";
import type { AdminPermissions } from "@/types";
import type { StaffAccessPreset } from "@/lib/admin/staff-permissions";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { userId } = await context.params;
    if (userId === auth.userId) {
      return NextResponse.json(
        { error: "You cannot change your own staff record from this screen." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      fullName?: string;
      phone?: string | null;
      role?: "admin" | "super_admin";
      isActive?: boolean;
      accessPreset?: StaffAccessPreset;
      permissions?: Partial<AdminPermissions>;
    };

    await updateStaffMember({
      userId,
      fullName: body.fullName,
      phone: body.phone,
      role: body.role,
      isActive: body.isActive,
      accessPreset: body.accessPreset,
      permissions: body.permissions,
    });

    const staff = await listStaffMembers();
    const updated = staff.find((member) => member.id === userId);

    return NextResponse.json({ staff: updated ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update staff member" },
      { status: 500 }
    );
  }
}
