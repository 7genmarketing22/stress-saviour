import { NextResponse } from "next/server";
import {
  createStaffMember,
  listStaffMembers,
  requireAdmin,
  requireSuperAdmin,
} from "@/lib/admin/staff-server";
import type { AdminPermissions } from "@/types";
import type { StaffAccessPreset } from "@/lib/admin/staff-permissions";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const staff = await listStaffMembers();
    return NextResponse.json({ staff, canManage: auth.profile.role === "super_admin" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load staff" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: "admin" | "super_admin";
      accessPreset?: StaffAccessPreset;
      permissions?: Partial<AdminPermissions>;
    };

    if (!body.fullName?.trim() || !body.email?.trim() || !body.password || body.password.length < 6) {
      return NextResponse.json(
        { error: "Full name, email, and a password of at least 6 characters are required." },
        { status: 400 }
      );
    }

    const userId = await createStaffMember({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      password: body.password,
      role: body.role === "super_admin" ? "super_admin" : "admin",
      accessPreset: body.accessPreset ?? "operations",
      permissions: body.permissions,
      createdBy: auth.userId,
    });

    const staff = await listStaffMembers();
    const created = staff.find((member) => member.id === userId);

    return NextResponse.json({ staff: created ?? null }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create staff member" },
      { status: 500 }
    );
  }
}
