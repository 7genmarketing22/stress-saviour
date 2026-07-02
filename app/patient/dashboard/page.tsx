"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  FileText, CreditCard, Video, ArrowRight, Plus, Activity, Heart, Search, Calendar,
  Brain, Clock, Star, TrendingUp, Shield, CheckCircle, DollarSign, Loader2,
} from "lucide-react";
import { usePatient } from "@/contexts/PatientContext";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  buildPrescriptions,
  getPatientAppointments,
  getPatientPayments,
  getRecentDoctors,
} from "@/lib/patient/api";
import {
  formatCurrency,
  formatRelativeDate,
  getFirstName,
  getUpcomingAppointments,
  mapToPatientAppointment,
  timeAgo,
} from "@/lib/patient/mappers";

export default function PatientDashboardPage() {
  const { profile } = usePatient();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<ReturnType<typeof mapToPatientAppointment>[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [prescriptionCount, setPrescriptionCount] = useState(0);

  const [rawAppointments, setRawAppointments] = useState<Awaited<ReturnType<typeof getPatientAppointments>>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [apts, payments] = await Promise.all([
          getPatientAppointments(),
          getPatientPayments(),
        ]);
        if (cancelled) return;
        setRawAppointments(apts);
        const mapped = apts.map(mapToPatientAppointment);
        setAppointments(mapped);
        setPrescriptionCount(buildPrescriptions(apts).length);
        setTotalSpent(
          payments
            .filter((p) => p.status === "completed")
            .reduce((sum, p) => sum + Number(p.amount), 0)
        );
      } catch {
        if (!cancelled) {
          setRawAppointments([]);
          setAppointments([]);
          setTotalSpent(0);
          setPrescriptionCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const upcoming = useMemo(() => getUpcomingAppointments(appointments), [appointments]);
  const nextApt = upcoming[0] ?? null;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;
  const recentDoctorsList = useMemo(() => getRecentDoctors(rawAppointments), [rawAppointments]);

  const nextAptDoctorAvatar = useMemo(() => {
    if (!nextApt) return null;
    const raw = rawAppointments.find((a) => a.id === nextApt.id);
    return raw?.doctor?.profile?.avatar_url ?? null;
  }, [nextApt, rawAppointments]);

  const stats = [
    {
      title: "Upcoming Appointments",
      value: String(upcoming.length),
      subtitle: "Scheduled",
      description: nextApt
        ? `Next: ${formatRelativeDate(nextApt.scheduledAt)} at ${nextApt.time}`
        : "No upcoming sessions",
      icon: Calendar,
      color: "text-brand-500 bg-brand-50",
      href: "/patient/appointments",
    },
    {
      title: "Active Prescriptions",
      value: String(prescriptionCount),
      subtitle: "Available",
      description: prescriptionCount > 0 ? "From completed consultations" : "None yet",
      icon: FileText,
      color: "text-emerald-600 bg-emerald-50",
      href: "/patient/prescriptions",
    },
    {
      title: "Total Sessions",
      value: String(completedCount),
      subtitle: "Completed",
      description: "Since joining platform",
      icon: Activity,
      color: "text-purple-600 bg-purple-50",
      href: "/patient/appointments",
    },
    {
      title: "Total Spent",
      value: formatCurrency(totalSpent),
      subtitle: "All time",
      description:
        completedCount > 0
          ? `Average ${formatCurrency(Math.round(totalSpent / completedCount))}/session`
          : "No payments yet",
      icon: DollarSign,
      color: "text-amber-600 bg-amber-50",
      href: "/patient/payments",
    },
  ];

  const recentActivity = useMemo(() => {
    const items: Array<{ action: string; time: string; icon: typeof CheckCircle; color: string }> = [];
    for (const apt of appointments.slice(0, 5)) {
      if (apt.status === "Completed") {
        items.push({
          action: `Completed session with ${apt.doctorName}`,
          time: timeAgo(apt.scheduledAt),
          icon: CheckCircle,
          color: "text-green-600",
        });
      } else if (["Confirmed", "Ready", "Pending"].includes(apt.status)) {
        items.push({
          action: `Upcoming appointment with ${apt.doctorName}`,
          time: timeAgo(apt.createdAt),
          icon: Calendar,
          color: "text-amber-600",
        });
      }
    }
    return items.slice(0, 4);
  }, [appointments]);

  const healthMetrics = [
    {
      label: "Sessions Attended",
      value: `${completedCount}/${Math.max(completedCount, 1)}`,
      percentage: completedCount > 0 ? 100 : 0,
      color: "bg-green-500",
    },
    {
      label: "Upcoming Care",
      value: `${upcoming.length} booked`,
      percentage: Math.min(upcoming.length * 25, 100),
      color: "bg-brand-500",
    },
    {
      label: "Consultation Goal",
      value: `${completedCount}/5`,
      percentage: Math.min((completedCount / 5) * 100, 100),
      color: "bg-purple-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-brand-600 to-brand-400 p-5 sm:p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-2 sm:space-y-3">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={profile.full_name}
              avatarUrl={profile.avatar_url}
              size="lg"
              ring
              className="border-white/30 bg-white/10 text-white"
            />
            <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-medium backdrop-blur-md">
            <Heart className="h-3 w-3 animate-pulse fill-white" />
            Pakistan&apos;s Premier Telehealth
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mt-2">
            Assalam-o-Alaikum, {getFirstName(profile.full_name)}!
          </h2>
            </div>
          </div>
          <p className="text-white/90 text-xs sm:text-sm md:text-base leading-relaxed">
            {nextApt
              ? `Welcome back. You have an upcoming ${nextApt.type.toLowerCase()} consultation with ${nextApt.doctorName}.`
              : "Welcome back to your Stress Saviors portal. Book a consultation when you're ready."}
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 hidden sm:flex items-center justify-center w-1/4 lg:w-1/3 opacity-10 sm:opacity-20 pointer-events-none">
          <Brain className="h-32 w-32 sm:h-36 sm:w-36 lg:h-44 lg:w-44 text-white" />
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link key={i} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs font-medium text-slate-600 truncate">{stat.title}</p>
                        <div className="flex items-baseline gap-1 mt-1 sm:mt-2">
                          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{stat.value}</h3>
                          <span className="text-[10px] sm:text-xs text-slate-600">{stat.subtitle}</span>
                        </div>
                      </div>
                      <div className={`rounded-lg p-1.5 sm:p-2 ${stat.color} flex-shrink-0`}>
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 truncate">{stat.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Next Appointment</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your next scheduled mental health consultation</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {nextApt ? (
                <div className="rounded-lg sm:rounded-xl border border-brand-100 bg-brand-50/50 p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={nextApt.doctorName}
                        avatarUrl={nextAptDoctorAvatar}
                        size="md"
                        className="bg-brand-500 text-white border-brand-300/50"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm sm:text-base truncate">{nextApt.doctorName}</h4>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">{nextApt.doctorSpecialization}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-green-700 w-fit">
                      {nextApt.status}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:gap-3 border-t border-b border-brand-100 py-3 sm:py-4 text-xs sm:text-sm grid-cols-1 xs:grid-cols-2">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-500 flex-shrink-0" />
                      <span className="truncate">{formatRelativeDate(nextApt.scheduledAt)}, {nextApt.timeRange}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-500 flex-shrink-0" />
                      <span className="truncate">{nextApt.type} Consultation</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-500 flex-shrink-0" />
                      <span>Fee: {formatCurrency(nextApt.consultationFee)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-500 flex-shrink-0" />
                      <span>{nextApt.duration}</span>
                    </div>
                  </div>
                  <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                    <a href={nextApt.roomUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2 h-9 sm:h-10 text-xs sm:text-sm shadow-lg shadow-brand-400/20">
                        <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>Join Consultation</span>
                      </Button>
                    </a>
                    <Link href="/patient/appointments" className="flex-1 xs:flex-none">
                      <Button variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                        View All
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <p>No upcoming appointments.</p>
                  <Link href="/patient/doctors">
                    <Button className="mt-4 bg-brand-500 hover:bg-brand-600 text-white" size="sm">
                      Book a Doctor
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">Your Health Journey</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Track your progress and achievements</CardDescription>
                </div>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              {healthMetrics.map((metric, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-slate-900">{metric.label}</span>
                    <span className="font-semibold text-slate-700">{metric.value}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${metric.color} transition-all duration-500`}
                      style={{ width: `${metric.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Quick Services</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Instant actions to manage your health portal</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:gap-3 px-4 sm:px-6">
              {[
                { title: "Find a Doctor", description: "Search verified specialists", href: "/patient/doctors", icon: Search, color: "bg-brand-50 text-brand-500" },
                { title: "Book Appointment", description: "Schedule new session", href: "/patient/doctors", icon: Plus, color: "bg-green-50 text-green-600" },
                { title: "View Prescriptions", description: "Download documents", href: "/patient/prescriptions", icon: FileText, color: "bg-purple-50 text-purple-600" },
                { title: "Payment History", description: "Track transactions", href: "/patient/payments", icon: CreditCard, color: "bg-amber-50 text-amber-600" },
              ].map((action, i) => {
                const Icon = action.icon;
                return (
                  <Link key={i} href={action.href} className="group">
                    <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-lg border border-slate-200 hover:border-brand-200 hover:bg-brand-50/50 transition-all duration-200">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className={`rounded-lg p-1.5 sm:p-2 ${action.color} flex-shrink-0`}>
                          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold leading-none truncate">{action.title}</p>
                          <p className="text-[10px] sm:text-xs text-slate-600 mt-1 truncate">{action.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 group-hover:text-brand-500 flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">Recent Doctors</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Your previous consultants</CardDescription>
                </div>
                <Link href="/patient/doctors">
                  <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              {recentDoctorsList.length > 0 ? recentDoctorsList.slice(0, 3).map((doc) => (
                <div key={doc.doctorProfileId} className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center flex-shrink-0">
                      <UserAvatar
                        name={doc.name}
                        avatarUrl={doc.avatarUrl}
                        size="sm"
                        className="h-9 w-9 sm:h-10 sm:w-10"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] sm:text-xs text-slate-600 truncate">{doc.specialization}</p>
                        {doc.rating > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                              <span className="text-[10px] sm:text-xs font-medium">{doc.rating.toFixed(1)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                        {doc.sessions} sessions • {timeAgo(doc.lastVisit)}
                      </p>
                    </div>
                  </div>
                  <Link href="/patient/doctors">
                    <Button variant="outline" size="sm" className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs">Book</Button>
                  </Link>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No doctors yet. Browse specialists to book.</p>
              )}
            </CardContent>
          </Card>

          {recentActivity.length > 0 && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 sm:px-6">
                {recentActivity.map((activity, i) => {
                  const Icon = activity.icon;
                  return (
                    <div key={i} className="flex items-start gap-2 sm:gap-3 pb-3 border-b border-slate-200 last:border-0 last:pb-0">
                      <div className="p-1.5 rounded-lg bg-slate-50 flex-shrink-0">
                        <Icon className={`h-3.5 w-3.5 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-slate-900">{activity.action}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 flex-shrink-0">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-purple-900 mb-1">Daily Wellness Tip</h4>
                  <p className="text-xs sm:text-sm text-purple-800 leading-relaxed">
                    Practice deep breathing for 5 minutes daily. It helps reduce stress and improves focus.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
