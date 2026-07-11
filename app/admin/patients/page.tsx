"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Search, Eye, Ban, Users, Calendar, Activity, MapPin, Mail, Phone,
  XCircle, CheckCircle, Clock, TrendingUp, ArrowUpRight, RefreshCw, Loader2,
  Filter, X,
} from "lucide-react";
import { type FilterPeriod, FILTER_LABELS, getDateRange, inDateRange } from "@/lib/utils/dateFilter";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  getAdminPatients,
  getAdminAppointments,
  getAdminPayments,
  buildPatientSummaries,
  registrationByMonth,
  setProfileActive,
  approvePatient,
  rejectPatient,
} from "@/lib/admin/api";
import { useAdmin } from "@/contexts/AdminContext";
import type { AdminAppointment, AdminPatientSummary, AdminPayment } from "@/lib/admin/types";
import type { Profile } from "@/types";

type PatientStatus = "active" | "inactive" | "blocked" | "pending";

function formatPKR(value: number) {
  return `₨${Math.round(value).toLocaleString("en-PK")}`;
}

function shortPKR(value: number) {
  if (value >= 1000) return `₨${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `₨${Math.round(value)}`;
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function deriveStatus(summary: AdminPatientSummary): PatientStatus {
  if (summary.profile.account_status === "pending") return "pending";
  if (!summary.profile.is_active) return "blocked";
  if (!summary.lastActivity) return "inactive";
  const days = (Date.now() - new Date(summary.lastActivity).getTime()) / (24 * 60 * 60 * 1000);
  return days <= 45 ? "active" : "inactive";
}

function relativeTime(date: string | null): string {
  if (!date) return "No activity";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(date).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminPatientsPage() {
  const { profile } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [patients, setPatients] = useState<Profile[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PatientStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Date filter
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const dateRange = useMemo(
    () => getDateRange(filterPeriod, customFrom, customTo),
    [filterPeriod, customFrom, customTo]
  );

  const handleFilterChange = (p: FilterPeriod) => {
    setFilterPeriod(p);
    setShowCustom(p === "custom");
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pats, apts, pays] = await Promise.all([
        getAdminPatients(),
        getAdminAppointments(),
        getAdminPayments(),
      ]);
      setPatients(pats);
      setAppointments(apts);
      setPayments(pays);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprovePatient = async (userId: string) => {
    setActionId(userId);
    setError(null);
    try {
      await approvePatient(userId, profile.id);
      await loadData();
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionId(null);
    }
  };

  const handleRejectPatient = async (userId: string) => {
    setActionId(userId);
    setError(null);
    try {
      await rejectPatient(userId);
      await loadData();
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActionId(null);
    }
  };

  const handleToggleActive = async (userId: string, makeActive: boolean) => {
    setActionId(userId);
    setError(null);
    try {
      await setProfileActive(userId, makeActive);
      await loadData();
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const summaries = buildPatientSummaries(patients, appointments, payments);
  const registrationData = registrationByMonth(patients, 6);

  // Date-filtered summaries (by patient registration date)
  const dateFilteredSummaries = useMemo(
    () => summaries.filter((s) => inDateRange(s.profile.created_at, dateRange)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [summaries, dateRange]
  );

  const filtered = dateFilteredSummaries.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.profile.full_name.toLowerCase().includes(q) ||
      s.profile.email.toLowerCase().includes(q) ||
      s.profile.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || deriveStatus(s) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: dateFilteredSummaries.length,
    pending: dateFilteredSummaries.filter((s) => s.profile.account_status === "pending").length,
    active: dateFilteredSummaries.filter((s) => deriveStatus(s) === "active").length,
    inactive: dateFilteredSummaries.filter((s) => deriveStatus(s) === "inactive").length,
    blocked: dateFilteredSummaries.filter((s) => deriveStatus(s) === "blocked").length,
  };
  const totalAppointments = dateFilteredSummaries.reduce((acc, s) => acc + s.totalAppointments, 0);
  const totalRevenue = dateFilteredSummaries.reduce((acc, s) => acc + s.totalSpent, 0);
  const newThisMonth = registrationData[registrationData.length - 1]?.count ?? 0;

  const getAccountBadge = (status: Profile["account_status"]) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-700 border-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
    };
    return badges[status];
  };

  const getStatusBadge = (status: PatientStatus) => {
    const badges: Record<PatientStatus, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-gray-100 text-gray-700 border-gray-200",
      blocked: "bg-red-100 text-red-700 border-red-200",
    };
    return badges[status];
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  const selected = summaries.find((s) => s.profile.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Manage Patients</h1>
          <p className="text-sm text-slate-600 mt-1">View patient accounts, activity, and billing</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Date filter bar */}
      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 shrink-0">
              <Filter className="h-3.5 w-3.5" />
              Registered:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["today", "week", "month", "3months", "custom"] as FilterPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handleFilterChange(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                    filterPeriod === p
                      ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600"
                  }`}
                >
                  {FILTER_LABELS[p]}
                </button>
              ))}
            </div>
            {showCustom && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-7 px-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-7 px-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
                />
                <button
                  onClick={() => { setCustomFrom(""); setCustomTo(""); setFilterPeriod("month"); setShowCustom(false); }}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <span className="ml-auto text-[11px] text-slate-400 hidden sm:block">
              {dateFilteredSummaries.length} patients — <span className="font-semibold text-slate-600">{FILTER_LABELS[filterPeriod]}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Patients</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{counts.total}</h3>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <span className="text-green-600 font-medium flex items-center">
                    <ArrowUpRight className="h-3 w-3" />+{newThisMonth}
                  </span>
                  <span className="text-slate-500">this month</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-brand-50">
                <Users className="h-5 w-5 text-brand-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Patients</p>
                <h3 className="text-3xl font-semibold text-green-600 mt-2">{counts.active}</h3>
                <p className="text-xs text-slate-500 mt-2">
                  {counts.total ? ((counts.active / counts.total) * 100).toFixed(0) : 0}% of total
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Appointments</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{totalAppointments}</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Avg {counts.total ? (totalAppointments / counts.total).toFixed(1) : 0} per patient
                </p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-50">
                <Calendar className="h-5 w-5 text-brand-300" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{shortPKR(totalRevenue)}</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Avg {shortPKR(counts.total ? totalRevenue / counts.total : 0)} per patient
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Registration Trend</CardTitle>
              <CardDescription>Monthly new patient signups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={registrationData}>
                    <defs>
                      <linearGradient id="registrations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                    <Area type="monotone" dataKey="count" name="New patients" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#registrations)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

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
                <div className="flex gap-2 flex-wrap">
                  {(["all", "pending", "active", "inactive", "blocked"] as const).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={statusFilter === status ? "default" : "outline"}
                      onClick={() => setStatusFilter(status)}
                      className="capitalize"
                    >
                      {status}
                      {status !== "all" && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-background rounded">
                          {status === "pending" ? counts.pending : counts[status]}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {filtered.map((s) => {
                  const status = deriveStatus(s);
                  return (
                    <div key={s.profile.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-300 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {initials(s.profile.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-slate-900">{s.profile.full_name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getAccountBadge(s.profile.account_status)}`}>
                              {s.profile.account_status}
                            </span>
                            {s.profile.account_status === "approved" && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(status)}`}>
                                {status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-600">
                            <Mail className="h-3 w-3" />
                            {s.profile.email}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {s.profile.city ?? "—"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {s.totalAppointments} appointments
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {relativeTime(s.lastActivity)}
                            </span>
                            <span className="font-medium text-green-600">{formatPKR(s.totalSpent)} spent</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={() => setSelectedId(s.profile.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {s.profile.account_status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-brand-500 hover:bg-brand-600 text-white"
                              disabled={actionId === s.profile.id}
                              onClick={() => handleApprovePatient(s.profile.id)}
                            >
                              {actionId === s.profile.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              disabled={actionId === s.profile.id}
                              onClick={() => handleRejectPatient(s.profile.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        ) : s.profile.is_active ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            disabled={actionId === s.profile.id}
                            onClick={() => handleToggleActive(s.profile.id, false)}
                          >
                            {actionId === s.profile.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            disabled={actionId === s.profile.id}
                            onClick={() => handleToggleActive(s.profile.id, true)}
                          >
                            {actionId === s.profile.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-900">No patients found</p>
                    <p className="text-sm text-slate-600 mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <CardDescription>Patient account states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-50">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <p className="text-xs text-slate-600">Pending approval</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{counts.pending}</p>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-xs text-slate-600">Active</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{counts.active}</p>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <p className="text-xs text-slate-600">Inactive</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{counts.inactive}</p>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50">
                    <Ban className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-xs text-slate-600">Blocked</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{counts.blocked}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Spending Patients</CardTitle>
              <CardDescription>Highest lifetime value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...summaries]
                  .sort((a, b) => b.totalSpent - a.totalSpent)
                  .slice(0, 5)
                  .map((s, i) => (
                    <div key={s.profile.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-300 flex items-center justify-center text-white font-semibold text-xs">
                          #{i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{s.profile.full_name}</p>
                          <p className="text-xs text-slate-600">{s.totalAppointments} appointments</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-green-600">{shortPKR(s.totalSpent)}</p>
                    </div>
                  ))}
                {summaries.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No patients yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedId(null)}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-300 flex items-center justify-center text-white font-semibold text-xl">
                    {initials(selected.profile.full_name)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{selected.profile.full_name}</CardTitle>
                    <CardDescription>
                      Member since {new Date(selected.profile.created_at).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}
                    </CardDescription>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(deriveStatus(selected))}`}>
                      {deriveStatus(selected)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Appointments</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{selected.totalAppointments}</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Upcoming</div>
                  <div className="text-2xl font-bold text-brand-300 mt-1">{selected.upcomingAppointments}</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Total Spent</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">{shortPKR(selected.totalSpent)}</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Age</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{calcAge(selected.profile.date_of_birth) ?? "—"}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Personal Information
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">Email</div>
                      <div className="font-medium text-sm">{selected.profile.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Phone className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">Phone</div>
                      <div className="font-medium text-sm">{selected.profile.phone ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">City</div>
                      <div className="font-medium text-sm">{selected.profile.city ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Users className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">Gender</div>
                      <div className="font-medium text-sm capitalize">{selected.profile.gender ?? "—"}</div>
                    </div>
                  </div>
                  {selected.preferredDoctor && (
                    <div className="p-3 bg-slate-50 rounded-lg sm:col-span-2">
                      <div className="text-xs text-slate-600">Most-seen Doctor</div>
                      <div className="font-medium text-sm mt-1">{selected.preferredDoctor}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                {selected.profile.account_status === "pending" ? (
                  <>
                    <Button
                      className="bg-brand-500 hover:bg-brand-600 text-white"
                      disabled={actionId === selected.profile.id}
                      onClick={() => handleApprovePatient(selected.profile.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Account
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      disabled={actionId === selected.profile.id}
                      onClick={() => handleRejectPatient(selected.profile.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                ) : selected.profile.is_active ? (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    disabled={actionId === selected.profile.id}
                    onClick={() => handleToggleActive(selected.profile.id, false)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Block Account
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="text-green-600 hover:bg-green-50"
                    disabled={actionId === selected.profile.id}
                    onClick={() => handleToggleActive(selected.profile.id, true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
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
