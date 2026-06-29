"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Users, UserCheck, Calendar, DollarSign, Star, Activity, AlertTriangle,
  CheckCircle2, RefreshCw, BarChart3, MessageSquare, XCircle, Loader2,
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart, CartesianGrid,
} from "recharts";
import { useAdmin } from "@/contexts/AdminContext";
import {
  approveDoctor,
  rejectDoctor,
  getAdminDoctors,
  getAdminPatients,
  getAdminAppointments,
  getAdminPayments,
  buildAdminStats,
  revenueByMonth,
  appointmentsByDay,
  topDoctors as buildTopDoctors,
  buildRecentActivity,
} from "@/lib/admin/api";
import type { AdminAppointment, AdminDoctor, AdminPayment } from "@/lib/admin/types";
import type { Profile } from "@/types";

function formatPKR(value: number) {
  return `₨${Math.round(value).toLocaleString("en-PK")}`;
}

function formatShortPKR(value: number) {
  if (value >= 1000) return `₨${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `₨${Math.round(value)}`;
}

export default function AdminDashboardPage() {
  const { profile } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [patients, setPatients] = useState<Profile[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docs, pats, apts, pays] = await Promise.all([
        getAdminDoctors(),
        getAdminPatients(),
        getAdminAppointments(),
        getAdminPayments(),
      ]);
      setDoctors(docs);
      setPatients(pats);
      setAppointments(apts);
      setPayments(pays);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (doctorId: string) => {
    setActionId(doctorId);
    try {
      await approveDoctor(doctorId, profile.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve doctor");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (doctorId: string) => {
    setActionId(doctorId);
    try {
      await rejectDoctor(doctorId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject doctor");
    } finally {
      setActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const stats = buildAdminStats(doctors, patients, appointments, payments);
  const revenueData = revenueByMonth(payments, 6);
  const appointmentData = appointmentsByDay(appointments);
  const pendingDoctors = doctors.filter((d) => d.status === "pending");
  const topDocs = buildTopDoctors(doctors, payments, appointments, 4);
  const recentActivity = buildRecentActivity(appointments, payments, patients, doctors, 5);
  const onlineDoctors = doctors.filter((d) => d.status === "approved" && d.is_available).length;
  const completedToday = stats.appointmentsTodayCompleted;

  const statCards = [
    {
      title: "Platform Revenue",
      value: formatPKR(stats.monthlyPlatformRevenue),
      change: `${formatPKR(stats.grossVolume)} gross volume`,
      icon: DollarSign,
      positive: true,
      description: "Commission earned this month",
    },
    {
      title: "Active Doctors",
      value: String(stats.activeDoctors),
      change: stats.newDoctorsThisMonth > 0 ? `+${stats.newDoctorsThisMonth} this month` : "No new joins",
      icon: UserCheck,
      positive: true,
      description: `${onlineDoctors} available now`,
    },
    {
      title: "Total Patients",
      value: String(stats.totalPatients),
      change: stats.newPatientsThisMonth > 0 ? `+${stats.newPatientsThisMonth} this month` : "No new signups",
      icon: Users,
      positive: true,
      description: `${stats.totalPatients} registered`,
    },
    {
      title: "Appointments Today",
      value: String(stats.appointmentsToday),
      change: `${stats.appointmentsTodayUpcoming} upcoming`,
      icon: Calendar,
      positive: true,
      description: `${completedToday} completed today`,
    },
    {
      title: "Pending Reviews",
      value: String(stats.pendingDoctors),
      change: stats.pendingDoctors > 0 ? "Action needed" : "All caught up",
      icon: AlertTriangle,
      positive: stats.pendingDoctors === 0,
      description: "Doctor applications",
    },
    {
      title: "Avg Rating",
      value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—",
      change: `${stats.totalReviews} reviews`,
      icon: Star,
      positive: true,
      description: "Across rated doctors",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Live overview of platform performance and activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="relative overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">{stat.title}</p>
                    <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                      <h3 className="text-2xl sm:text-3xl font-semibold text-slate-900">{stat.value}</h3>
                    </div>
                    <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">{stat.change}</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">{stat.description}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-lg ${stat.positive ? "bg-teal-50" : "bg-amber-50"} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.positive ? "text-teal-600" : "text-amber-600"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Revenue Overview</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Monthly platform commission</CardDescription>
                </div>
                <Link href="/admin/payments">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    <span className="text-xs sm:text-sm">View Report</span>
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-[250px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(value) => formatShortPKR(value)} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [formatPKR(Number(value ?? 0)), "Commission"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#revenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Weekly Appointments</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Bookings over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-[200px] sm:h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="count" name="Appointments" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Doctor Verifications</CardTitle>
              <CardDescription>Applications awaiting review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingDoctors.map((doc) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-medium text-sm">
                      {(doc.profile?.full_name ?? "Dr")
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{doc.profile?.full_name ?? "Unnamed doctor"}</p>
                      <p className="text-sm text-slate-600">{doc.specialization}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                        <span>{doc.pmdc_number}</span>
                        <span>•</span>
                        <span>{doc.experience_years} yrs</span>
                        <span>•</span>
                        <span>Applied {new Date(doc.created_at).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(doc.id)}
                      disabled={actionId === doc.id}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {actionId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(doc.id)}
                      disabled={actionId === doc.id}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {pendingDoctors.length === 0 && (
                <div className="text-center py-12 border border-dashed border-slate-300 rounded-lg">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-sm font-medium text-slate-900">All caught up!</p>
                  <p className="text-sm text-slate-600 mt-1">No pending verifications</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">{activity.text}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(activity.at).toLocaleDateString("en-PK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No activity yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Doctors</CardTitle>
              <CardDescription>Highest earners</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topDocs.map((doctor, i) => (
                  <div key={doctor.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-semibold text-xs">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{doctor.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-600">{doctor.consultations} sessions</span>
                          {doctor.rating > 0 && (
                            <>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-yellow-600 flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-yellow-600" />
                                {doctor.rating.toFixed(1)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-teal-600">{formatShortPKR(doctor.earnings)}</p>
                    </div>
                  </div>
                ))}
                {topDocs.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No doctors yet.</p>
                )}
              </div>
              <Link href="/admin/doctors">
                <Button variant="outline" className="w-full mt-4" size="sm">
                  View All Doctors
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/doctors">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Review Doctors
                </Button>
              </Link>
              <Link href="/admin/reports">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </Link>
              <Link href="/admin/appointments">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Monitor Appointments
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
