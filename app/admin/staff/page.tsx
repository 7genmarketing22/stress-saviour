"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Search, Eye, Users, Shield, Activity, Mail, Phone, XCircle,
  CheckCircle, ShieldCheck, RefreshCw, Loader2, Ban, Plus, Pencil,
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import {
  createAdminStaffMember,
  getAdminStaffDetailed,
  updateAdminStaffMember,
} from "@/lib/admin/api";
import type { AdminStaffMember } from "@/lib/admin/staff-types";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  STAFF_ACCESS_PRESETS,
  STAFF_PRESET_OPTIONS,
  ALL_PERMISSIONS,
  NO_PERMISSIONS,
  countEnabledPermissions,
  inferAccessPreset,
  type StaffAccessPreset,
} from "@/lib/admin/staff-permissions";
import type { AdminPermissions, UserRole } from "@/types";
import { getErrorMessage } from "@/lib/errors";

function roleLabel(role: UserRole) {
  return role === "super_admin" ? "Super Admin" : "Admin";
}

function roleColor(role: UserRole) {
  return role === "super_admin" ? "from-violet-500 to-fuchsia-600" : "from-brand-400 to-brand-300";
}

function accessBadge(member: AdminStaffMember) {
  if (member.role === "super_admin") return "Full access";
  const perms = member.staffRecord?.permissions;
  if (!perms) return "No permissions set";
  const preset = inferAccessPreset(perms);
  if (preset !== "custom") return STAFF_ACCESS_PRESETS[preset].label;
  return `${countEnabledPermissions(perms)} custom permissions`;
}

type StaffFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "super_admin";
  accessPreset: StaffAccessPreset;
  permissions: AdminPermissions;
};

const defaultFormState = (): StaffFormState => ({
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "admin",
  accessPreset: "operations",
  permissions: STAFF_ACCESS_PRESETS.operations.permissions,
});

function formFromMember(member: AdminStaffMember): StaffFormState {
  const perms =
    member.role === "super_admin"
      ? ALL_PERMISSIONS
      : member.staffRecord?.permissions ?? NO_PERMISSIONS;
  const preset = member.role === "super_admin" ? "full" : inferAccessPreset(perms);

  return {
    fullName: member.full_name,
    email: member.email,
    phone: member.phone ?? "",
    password: "",
    role: member.role === "super_admin" ? "super_admin" : "admin",
    accessPreset: preset,
    permissions: perms,
  };
}

function PermissionsEditor({
  role,
  accessPreset,
  permissions,
  onPresetChange,
  onPermissionToggle,
}: {
  role: "admin" | "super_admin";
  accessPreset: StaffAccessPreset;
  permissions: AdminPermissions;
  onPresetChange: (preset: StaffAccessPreset) => void;
  onPermissionToggle: (key: keyof AdminPermissions, enabled: boolean) => void;
}) {
  if (role === "super_admin") {
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
        Super administrators always have full platform access.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Access preset</Label>
        <p className="text-xs text-slate-500 mb-3">
          Pick a preset or choose Custom and toggle individual permissions below.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {STAFF_PRESET_OPTIONS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onPresetChange(preset.value)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                accessPreset === preset.value
                  ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
                  : "border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/30"
              }`}
            >
              <div className="font-medium text-sm text-slate-900">{preset.label}</div>
              <div className="text-xs text-slate-500 mt-1">{preset.description}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPresetChange("custom")}
            className={`text-left p-3 rounded-lg border transition-colors ${
              accessPreset === "custom"
                ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
                : "border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/30"
            }`}
          >
            <div className="font-medium text-sm text-slate-900">Custom</div>
            <div className="text-xs text-slate-500 mt-1">Choose exactly which areas this staff member can access</div>
          </button>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Permissions</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          {PERMISSION_KEYS.map((key) => {
            const enabled = permissions[key];
            return (
              <label
                key={key}
                className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  enabled
                    ? "border-brand-200 bg-brand-50/50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onPermissionToggle(key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-brand-500"
                />
                <span className="text-sm text-slate-900">{PERMISSION_LABELS[key]}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminStaffPage() {
  const { profile: currentAdmin } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const [staff, setStaff] = useState<AdminStaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<AdminStaffMember | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<StaffFormState>(defaultFormState);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminStaffDetailed();
      setStaff(result.staff);
      setCanManage(result.canManage);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load staff"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return staff.filter(
      (s) => s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [staff, searchQuery]);

  const stats = useMemo(
    () => ({
      total: staff.length,
      superAdmins: staff.filter((s) => s.role === "super_admin").length,
      admins: staff.filter((s) => s.role === "admin").length,
      active: staff.filter((s) => s.is_active).length,
    }),
    [staff]
  );

  const initials = (name: string) => name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  const handlePresetChange = (preset: StaffAccessPreset) => {
    setForm((prev) => ({
      ...prev,
      accessPreset: preset,
      permissions:
        preset === "custom"
          ? prev.permissions
          : STAFF_ACCESS_PRESETS[preset].permissions,
    }));
  };

  const handlePermissionToggle = (key: keyof AdminPermissions, enabled: boolean) => {
    setForm((prev) => ({
      ...prev,
      accessPreset: "custom",
      permissions: { ...prev.permissions, [key]: enabled },
    }));
  };

  const handleRoleChange = (role: "admin" | "super_admin") => {
    setForm((prev) => ({
      ...prev,
      role,
      accessPreset: role === "super_admin" ? "full" : prev.accessPreset === "full" ? "operations" : prev.accessPreset,
      permissions: role === "super_admin" ? ALL_PERMISSIONS : prev.permissions,
    }));
  };

  const openAdd = () => {
    setForm(defaultFormState());
    setShowAdd(true);
    setSelected(null);
    setEditMode(false);
  };

  const openView = (member: AdminStaffMember) => {
    setSelected(member);
    setForm(formFromMember(member));
    setEditMode(false);
    setShowAdd(false);
  };

  const openEdit = (member: AdminStaffMember) => {
    setSelected(member);
    setForm(formFromMember(member));
    setEditMode(true);
    setShowAdd(false);
  };

  const closeModal = () => {
    setSelected(null);
    setShowAdd(false);
    setEditMode(false);
    setForm(defaultFormState());
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await createAdminStaffMember({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: form.role,
        accessPreset: form.accessPreset,
        permissions: form.accessPreset === "custom" ? form.permissions : undefined,
      });
      await loadData();
      closeModal();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create staff member"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateAdminStaffMember(selected.id, {
        fullName: form.fullName,
        phone: form.phone || null,
        role: form.role,
        accessPreset: form.accessPreset,
        permissions: form.accessPreset === "custom" ? form.permissions : undefined,
      });
      await loadData();
      closeModal();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update staff member"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: AdminStaffMember, makeActive: boolean) => {
    setActionId(member.id);
    setError(null);
    try {
      await updateAdminStaffMember(member.id, { isActive: makeActive });
      await loadData();
      closeModal();
    } catch (err) {
      setError(getErrorMessage(err, "Action failed"));
    } finally {
      setActionId(null);
    }
  };

  const canEditMember = (member: AdminStaffMember) =>
    canManage && member.id !== currentAdmin.id && member.role !== "super_admin";

  const canBlockMember = (member: AdminStaffMember) =>
    canManage && member.id !== currentAdmin.id && member.role !== "super_admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-600 mt-1">
            Add staff, assign roles, and control role-specific or full platform access
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {!canManage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You can view staff members. Only super administrators can add, edit, or block staff.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Staff</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{stats.total}</h3>
                <p className="text-xs text-slate-500 mt-2">{stats.active} active</p>
              </div>
              <div className="p-3 rounded-lg bg-brand-50"><Users className="h-5 w-5 text-brand-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Super Admins</p>
                <h3 className="text-3xl font-semibold text-violet-600 mt-2">{stats.superAdmins}</h3>
                <p className="text-xs text-slate-500 mt-2">Full access</p>
              </div>
              <div className="p-3 rounded-lg bg-violet-50"><ShieldCheck className="h-5 w-5 text-violet-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Admins</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{stats.admins}</h3>
                <p className="text-xs text-slate-500 mt-2">Role-based access</p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-50"><Shield className="h-5 w-5 text-brand-300" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active</p>
                <h3 className="text-3xl font-semibold text-green-600 mt-2">{stats.active}</h3>
                <p className="text-xs text-slate-500 mt-2">Able to sign in</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50"><CheckCircle className="h-5 w-5 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-200">
            {filtered.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${roleColor(member.role)} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                    {initials(member.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-slate-900">{member.full_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${member.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                        {member.is_active ? "active" : "blocked"}
                      </span>
                      {member.id === currentAdmin.id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">You</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-600">
                      <Shield className="h-3 w-3" />
                      {roleLabel(member.role)}
                      <span className="text-slate-300">·</span>
                      <span>{accessBadge(member)}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span>
                      <span>Joined {new Date(member.created_at).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {canEditMember(member) && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(member)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openView(member)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                <p className="text-sm font-medium text-slate-900">No staff members found</p>
                <p className="text-sm text-slate-600 mt-1">
                  {canManage ? "Add a staff member to get started" : "Try adjusting your search"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(showAdd || selected) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {showAdd ? "Add Staff Member" : editMode ? "Edit Staff Member" : selected?.full_name}
                  </CardTitle>
                  <CardDescription>
                    {showAdd
                      ? "Create a new administrator account with specific access"
                      : editMode
                        ? "Update profile, role, and permissions"
                        : roleLabel(selected!.role)}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={closeModal}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(showAdd || editMode) ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        disabled={!showAdd}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    {showAdd && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Temporary password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={form.password}
                          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                          placeholder="Min. 6 characters"
                        />
                      </div>
                    )}
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="role">Role</Label>
                      <select
                        id="role"
                        value={form.role}
                        onChange={(e) => handleRoleChange(e.target.value as "admin" | "super_admin")}
                        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="admin">Admin (custom access)</option>
                        <option value="super_admin">Super Admin (full access)</option>
                      </select>
                    </div>
                  </div>

                  <PermissionsEditor
                    role={form.role}
                    accessPreset={form.accessPreset}
                    permissions={form.permissions}
                    onPresetChange={handlePresetChange}
                    onPermissionToggle={handlePermissionToggle}
                  />

                  <div className="flex gap-2 pt-4 border-t border-slate-200">
                    <Button variant="outline" onClick={closeModal} disabled={saving}>
                      Cancel
                    </Button>
                    <Button
                      onClick={showAdd ? handleCreate : handleUpdate}
                      disabled={saving || !form.fullName.trim() || (showAdd && (!form.email.trim() || form.password.length < 6))}
                    >
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {showAdd ? "Create Staff Member" : "Save Changes"}
                    </Button>
                  </div>
                </>
              ) : selected && (
                <>
                  <div className="flex items-center gap-4">
                    <div className={`h-16 w-16 rounded-full bg-gradient-to-br ${roleColor(selected.role)} flex items-center justify-center text-white font-semibold text-xl`}>
                      {initials(selected.full_name)}
                    </div>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${selected.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                        {selected.is_active ? "active" : "blocked"}
                      </span>
                      <p className="text-sm text-slate-600 mt-1">{accessBadge(selected)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contact Information
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Mail className="h-4 w-4 text-slate-600" />
                        <div>
                          <div className="text-xs text-slate-600">Email</div>
                          <div className="font-medium text-sm">{selected.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Phone className="h-4 w-4 text-slate-600" />
                        <div>
                          <div className="text-xs text-slate-600">Phone</div>
                          <div className="font-medium text-sm">{selected.phone ?? "—"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Permissions
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {PERMISSION_KEYS.map((key) => {
                        const enabled =
                          selected.role === "super_admin" ||
                          Boolean(selected.staffRecord?.permissions[key]);
                        return (
                          <div
                            key={key}
                            className={`flex items-center gap-2 p-3 rounded-lg ${
                              enabled ? "bg-green-50" : "bg-slate-50 opacity-60"
                            }`}
                          >
                            {enabled ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="text-sm text-slate-900">{PERMISSION_LABELS[key]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Account Information
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-600">Member Since</div>
                        <div className="font-medium text-sm mt-1">
                          {new Date(selected.created_at).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-600">Account ID</div>
                        <div className="font-mono text-xs mt-1">{selected.id.slice(0, 12)}…</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-200 flex-wrap">
                    {canEditMember(selected) && (
                      <Button variant="outline" onClick={() => setEditMode(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    {!canBlockMember(selected) ? (
                      <div className="flex-1 text-center p-3 bg-slate-50 rounded-lg min-w-[200px]">
                        <p className="text-sm text-slate-600 font-medium">
                          {selected.id === currentAdmin.id
                            ? "This is your own account."
                            : "Super Admin accounts cannot be blocked."}
                        </p>
                      </div>
                    ) : selected.is_active ? (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        disabled={actionId === selected.id}
                        onClick={() => handleToggleActive(selected, false)}
                      >
                        {actionId === selected.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4 mr-2" />
                        )}
                        Block Account
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="text-green-600 hover:bg-green-50"
                        disabled={actionId === selected.id}
                        onClick={() => handleToggleActive(selected, true)}
                      >
                        {actionId === selected.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Unblock Account
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
