"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Search, Eye, Users, Shield, Activity, Mail, Phone, XCircle,
  CheckCircle, ShieldCheck, RefreshCw, Loader2, Ban,
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { getAdminStaff, setProfileActive } from "@/lib/admin/api";
import type { Profile, UserRole } from "@/types";

function roleLabel(role: UserRole) {
  return role === "super_admin" ? "Super Admin" : "Admin";
}

function roleColor(role: UserRole) {
  return role === "super_admin" ? "from-violet-500 to-fuchsia-600" : "from-teal-500 to-cyan-600";
}

export default function AdminStaffPage() {
  const { profile: currentAdmin } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [staff, setStaff] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setStaff(await getAdminStaff());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActive = async (userId: string, makeActive: boolean) => {
    setActionId(userId);
    setError(null);
    try {
      await setProfileActive(userId, makeActive);
      await loadData();
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const filtered = staff.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const stats = {
    total: staff.length,
    superAdmins: staff.filter((s) => s.role === "super_admin").length,
    admins: staff.filter((s) => s.role === "admin").length,
    active: staff.filter((s) => s.is_active).length,
  };

  const initials = (name: string) => name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-600 mt-1">Administrator accounts with platform access</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

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
              <div className="p-3 rounded-lg bg-teal-50"><Users className="h-5 w-5 text-teal-600" /></div>
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
                <p className="text-xs text-slate-500 mt-2">Operational access</p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-50"><Shield className="h-5 w-5 text-cyan-600" /></div>
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
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span>
                      <span>Joined {new Date(member.created_at).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="outline" onClick={() => setSelected(member)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                <p className="text-sm font-medium text-slate-900">No staff members found</p>
                <p className="text-sm text-slate-600 mt-1">Try adjusting your search</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-16 w-16 rounded-full bg-gradient-to-br ${roleColor(selected.role)} flex items-center justify-center text-white font-semibold text-xl`}>
                    {initials(selected.full_name)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{selected.full_name}</CardTitle>
                    <CardDescription>{roleLabel(selected.role)}</CardDescription>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium border ${selected.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                      {selected.is_active ? "active" : "blocked"}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  Access Level
                </h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(selected.role === "super_admin"
                    ? ["Full Access", "Manage Staff", "Doctor Verification", "Financial Access", "Platform Settings", "Patient Management"]
                    : ["Doctor Verification", "Patient Management", "View Reports", "Appointment Oversight"]
                  ).map((perm, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-slate-900">{perm}</span>
                    </div>
                  ))}
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
                    <div className="font-medium text-sm mt-1">{new Date(selected.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Account ID</div>
                    <div className="font-mono text-xs mt-1">{selected.id.slice(0, 12)}…</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                {selected.id === currentAdmin.id || selected.role === "super_admin" ? (
                  <div className="flex-1 text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 font-medium">
                      {selected.id === currentAdmin.id ? "This is your own account." : "Super Admin accounts cannot be blocked."}
                    </p>
                  </div>
                ) : selected.is_active ? (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    disabled={actionId === selected.id}
                    onClick={() => handleToggleActive(selected.id, false)}
                  >
                    {actionId === selected.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                    Block Account
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="text-green-600 hover:bg-green-50"
                    disabled={actionId === selected.id}
                    onClick={() => handleToggleActive(selected.id, true)}
                  >
                    {actionId === selected.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Unblock Account
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
