"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  DollarSign, Activity, Calendar, Users, UserCheck, Star,
  CheckCircle, XCircle, Clock, BarChart3, RefreshCw, Loader2,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  getAdminDoctors,
  getAdminPatients,
  getAdminAppointments,
  getAdminPayments,
  revenueByMonth,
} from "@/lib/admin/api";
import type { AdminAppointment, AdminDoctor, AdminPayment } from "@/lib/admin/types";
import type { PaymentMethod, Profile } from "@/types";

const CHART_COLORS = ["#0d9488", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TYPE_LABEL = { video: "Video", chat: "Chat", in_person: "In-Person" } as const;
const METHOD_LABEL: Record<PaymentMethod, string> = {
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  stripe: "Card",
  bank_transfer: "Bank Transfer",
};

function shortPKR(value: number) {
  if (value >= 1000) return `₨${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `₨${Math.round(value)}`;
}

export default function AdminReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const completedPayments = useMemo(() => payments.filter((p) => p.status === "completed"), [payments]);
  const completedAppointments = useMemo(() => appointments.filter((a) => a.status === "completed"), [appointments]);

  const trendData = useMemo(() => {
    const rev = revenueByMonth(payments, 6);
    const now = new Date();
    const earliest = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return rev.map((bucket, i) => {
      const monthDate = new Date(earliest.getFullYear(), earliest.getMonth() + i, 1);
      const apptCount = appointments.filter((a) => {
        const d = new Date(a.scheduled_at);
        return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
      }).length;
      return { date: MONTH_LABELS[monthDate.getMonth()], revenue: bucket.revenue, appointments: apptCount };
    });
  }, [payments, appointments]);

  const typeData = useMemo(() => {
    const counts = { video: 0, chat: 0, in_person: 0 };
    for (const a of appointments) counts[a.appointment_type] += 1;
    return (Object.keys(counts) as Array<keyof typeof counts>)
      .map((k) => ({ type: TYPE_LABEL[k], count: counts[k] }))
      .filter((d) => d.count > 0);
  }, [appointments]);

  const specializationData = useMemo(() => {
    const map = new Map<string, { volume: number; revenue: number }>();
    for (const doc of doctors) {
      if (!map.has(doc.specialization)) map.set(doc.specialization, { volume: 0, revenue: 0 });
    }
    for (const a of completedAppointments) {
      const spec = a.doctor?.specialization;
      if (!spec) continue;
      const entry = map.get(spec) ?? { volume: 0, revenue: 0 };
      entry.volume += 1;
      entry.revenue += Number(a.consultation_fee);
      map.set(spec, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [doctors, completedAppointments]);

  const paymentMethodData = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const p of completedPayments) {
      map.set(p.payment_method, (map.get(p.payment_method) ?? 0) + Number(p.amount));
      total += Number(p.amount);
    }
    return Array.from(map.entries())
      .map(([method, amount]) => ({
        name: METHOD_LABEL[method as PaymentMethod] ?? method,
        amount,
        value: total ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [completedPayments]);

  const peakHoursData = useMemo(() => {
    const buckets = new Map<number, number>();
    for (const a of appointments) {
      const hour = new Date(a.scheduled_at).getHours();
      buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, bookings]) => {
        const label = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
        return { hour: label, bookings };
      });
  }, [appointments]);

  const cityData = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of patients) {
      const city = p.city ?? "Unknown";
      map.set(city, (map.get(city) ?? 0) + 1);
    }
    const total = patients.length || 1;
    return Array.from(map.entries())
      .map(([city, count]) => ({ city, patients: count, percentage: (count / total) * 100 }))
      .sort((a, b) => b.patients - a.patients)
      .slice(0, 5);
  }, [patients]);

  const topDocs = useMemo(() => {
    return doctors
      .map((doc) => {
        const revenue = completedPayments
          .filter((p) => p.doctor_id === doc.id)
          .reduce((s, p) => s + Number(p.doctor_earning), 0);
        const consultations = completedAppointments.filter((a) => a.doctor_id === doc.id).length;
        return {
          id: doc.id,
          name: doc.profile?.full_name ?? "Doctor",
          specialty: doc.specialization,
          rating: Number(doc.rating) || 0,
          consultations,
          revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.consultations - a.consultations)
      .slice(0, 5);
  }, [doctors, completedPayments, completedAppointments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const grossVolume = completedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const commission = completedPayments.reduce((s, p) => s + Number(p.platform_fee), 0);
  const activeDoctors = doctors.filter((d) => d.status === "approved").length;
  const ratedDoctors = doctors.filter((d) => Number(d.total_reviews) > 0);
  const avgRating = ratedDoctors.length
    ? ratedDoctors.reduce((s, d) => s + Number(d.rating), 0) / ratedDoctors.length
    : 0;
  const cancelled = appointments.filter((a) => a.status === "cancelled" || a.status === "no_show").length;
  const completionRate = appointments.length ? (completedAppointments.length / appointments.length) * 100 : 0;
  const cancellationRate = appointments.length ? (cancelled / appointments.length) * 100 : 0;
  const avgSession = completedAppointments.length
    ? completedAppointments.reduce((s, a) => s + a.duration_minutes, 0) / completedAppointments.length
    : 0;

  const metrics = [
    { title: "Gross Revenue", value: shortPKR(grossVolume), icon: DollarSign, color: "bg-green-50", iconColor: "text-green-600", description: `${shortPKR(commission)} commission` },
    { title: "Total Appointments", value: String(appointments.length), icon: Calendar, color: "bg-sky-50", iconColor: "text-sky-600", description: `${completedAppointments.length} completed` },
    { title: "Active Doctors", value: String(activeDoctors), icon: UserCheck, color: "bg-teal-50", iconColor: "text-teal-600", description: `${doctors.length} total` },
    { title: "Total Patients", value: String(patients.length), icon: Users, color: "bg-cyan-50", iconColor: "text-cyan-600", description: "Registered users" },
    { title: "Avg Rating", value: avgRating > 0 ? avgRating.toFixed(1) : "—", icon: Star, color: "bg-yellow-50", iconColor: "text-yellow-600", description: `${ratedDoctors.length} rated doctors` },
    { title: "Completion Rate", value: `${completionRate.toFixed(0)}%`, icon: CheckCircle, color: "bg-emerald-50", iconColor: "text-emerald-600", description: "Successful sessions" },
    { title: "Avg Session", value: `${Math.round(avgSession)} min`, icon: Clock, color: "bg-slate-50", iconColor: "text-slate-600", description: "Per consultation" },
    { title: "Cancellation Rate", value: `${cancellationRate.toFixed(0)}%`, icon: XCircle, color: "bg-red-50", iconColor: "text-red-600", description: `${cancelled} cancelled/no-show` },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Reports & Analytics</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">Live platform analytics and performance insights</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">{metric.title}</p>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-slate-900">{metric.value}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500">{metric.description}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-lg ${metric.color} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${metric.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-7">
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Revenue & Appointments Trend</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-[250px] sm:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="appointments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickFormatter={(value) => shortPKR(value)} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#revenue)" name="Commission (₨)" />
                    <Area yAxisId="right" type="monotone" dataKey="appointments" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#appointments)" name="Appointments" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Top Specializations</CardTitle>
                <CardDescription className="text-xs sm:text-sm">By completed sessions</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-3 sm:space-y-4">
                  {specializationData.map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                        <span className="font-medium text-slate-900 truncate">{item.name}</span>
                        <span className="text-slate-600 whitespace-nowrap text-[10px] sm:text-xs">{item.volume} sessions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 transition-all duration-500"
                            style={{ width: `${specializationData[0]?.volume ? (item.volume / specializationData[0].volume) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-green-600 min-w-[50px] sm:min-w-[70px] text-right">
                          {shortPKR(item.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {specializationData.length === 0 && <p className="text-sm text-slate-500 py-4 text-center">No data yet.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Peak Booking Hours</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Hourly appointment distribution</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-[250px] sm:h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHoursData} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="hour" stroke="#94a3b8" fontSize={9} angle={-45} textAnchor="end" height={70} />
                      <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="bookings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Top Performing Doctors</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Highest revenue generators</CardDescription>
                </div>
                <Link href="/admin/doctors">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <span className="text-xs sm:text-sm">View All</span>
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {topDocs.map((doctor, i) => (
                  <div key={doctor.id} className="flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 transition-colors gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                        #{i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm sm:text-base text-slate-900 truncate">{doctor.name}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">{doctor.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="font-semibold text-green-600">{shortPKR(doctor.revenue)}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500">Revenue</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{doctor.consultations}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500">Sessions</p>
                      </div>
                      {doctor.rating > 0 && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-600" />
                          <span className="font-semibold text-xs sm:text-sm">{doctor.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {topDocs.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No doctors yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Appointment Types</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Session distribution</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="h-[180px] sm:h-[200px] w-full relative mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="count" stroke="none">
                      {typeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{appointments.length}</p>
                  <p className="text-[10px] sm:text-xs text-slate-600">Total</p>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {typeData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 sm:p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs sm:text-sm font-medium text-slate-900 truncate">{item.type}</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">{item.count}</p>
                  </div>
                ))}
                {typeData.length === 0 && <p className="text-sm text-slate-500 py-2 text-center">No appointments yet.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Payment Methods</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Transaction split</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              {paymentMethodData.map((method, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="font-medium text-slate-900 truncate">{method.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{method.value}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${method.value}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-600 min-w-[50px] text-right">{shortPKR(method.amount)}</span>
                  </div>
                </div>
              ))}
              {paymentMethodData.length === 0 && <p className="text-sm text-slate-500 py-2 text-center">No payments yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Geographic Distribution</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Patients by city</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
              {cityData.map((city, i) => (
                <div key={i} className="flex items-center justify-between p-2 sm:p-3 border border-slate-200 rounded-lg gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">{city.city}</p>
                    <p className="text-[10px] sm:text-xs text-slate-600">{city.percentage.toFixed(0)}% of total</p>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900">{city.patients}</p>
                </div>
              ))}
              {cityData.length === 0 && <p className="text-sm text-slate-500 py-2 text-center">No patients yet.</p>}
              <Link href="/admin/patients">
                <Button variant="outline" className="w-full mt-2" size="sm">
                  <span className="text-xs sm:text-sm">View All Patients</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 sm:px-6">
              <Link href="/admin/payments">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span className="text-xs sm:text-sm">Financial Oversight</span>
                </Button>
              </Link>
              <Link href="/admin/appointments">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Activity className="h-4 w-4 mr-2" />
                  <span className="text-xs sm:text-sm">Appointment Monitor</span>
                </Button>
              </Link>
              <Link href="/admin/doctors">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <span className="text-xs sm:text-sm">Doctor Performance</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
