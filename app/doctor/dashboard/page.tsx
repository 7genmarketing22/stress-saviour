"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Users,
  DollarSign,
  Video,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Brain,
  Star,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  X,
  CheckCircle,
  Activity,
  Check,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { useDoctor } from "@/contexts/DoctorContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { usePaymentsRealtime } from "@/lib/realtime/usePaymentsRealtime";
import { useAppointmentSessionSync } from "@/lib/hooks/useAppointmentSessionSync";
import { AppointmentSessionAlert } from "@/components/shared/AppointmentSessionAlert";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  buildLastVisitMap,
  getDoctorAppointments,
  getDoctorPayments,
  saveClinicalRecords,
  updateDoctorDocuments,
} from "@/lib/doctor/api";
import { isDoctorNetEarning } from "@/lib/doctor/stats";
import {
  DashboardSession,
  formatCurrency,
  formatTime,
  isToday,
  mapToDashboardSession,
  timeAgo,
  toLocalDateKey,
} from "@/lib/doctor/mappers";

export default function DoctorDashboardPage() {
  const router = useRouter();
  const { profile, doctorProfile, documents, setDocuments } = useDoctor();
  const { notifications: contextNotifications } = useNotifications();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [toastMessage, setToastMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [patientMoods, setPatientMoods] = useState<
    Array<{ name: string; type: string; value: string; level: string; color: string }>
  >([]);
  const [earningsData, setEarningsData] = useState<Array<{ name: string; amount: number }>>([]);
  const [weekSchedule, setWeekSchedule] = useState<
    Array<{ day: string; date: string; sessions: number }>
  >([]);
  const [recentActivity, setRecentActivity] = useState<
    Array<{ id: string; text: string; time: string }>
  >([]);
  const [wallet, setWallet] = useState({ disbursable: 0, pending: 0 });
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [uniquePatients, setUniquePatients] = useState(0);
  const [newPatientsThisWeek, setNewPatientsThisWeek] = useState(0);

  // Modals State
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesSession, setNotesSession] = useState<DashboardSession | null>(null);

  // Form inputs for Clinical Notes / Prescription
  const [clinicalNoteInput, setClinicalNoteInput] = useState("");
  const [medicationInput, setMedicationInput] = useState("");
  const [dosageInput, setDosageInput] = useState("");

  const [tasks, setTasks] = useState(
    documents.practice_tasks ?? [
      { id: 1, text: "Review pending consultation notes", completed: false },
      { id: 2, text: "Confirm today's appointment schedule", completed: false },
    ]
  );

  const loadDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [appointments, payments] = await Promise.all([
        getDoctorAppointments(doctorProfile.id),
        getDoctorPayments(doctorProfile.id),
      ]);

      const lastVisitMap = buildLastVisitMap(appointments);
      const mappedSessions = appointments
        .filter((apt) => isToday(apt.scheduled_at) || new Date(apt.scheduled_at) >= new Date())
        .map((apt) => mapToDashboardSession(apt, lastVisitMap));

      setSessions(mappedSessions);

      const todayAppointments = appointments.filter((apt) => isToday(apt.scheduled_at));
      setPatientMoods(
        todayAppointments
          .filter((apt) => apt.patient_notes?.trim())
          .slice(0, 3)
          .map((apt, idx) => {
            const colors = [
              "text-emerald-600 bg-emerald-50 border-emerald-200",
              "text-amber-600 bg-amber-50 border-amber-200",
              "text-rose-600 bg-rose-50 border-rose-200",
            ];
            return {
              name: apt.patient?.full_name ?? "Patient",
              type: "Patient Intake Note",
              value: String((apt.patient_notes?.length ?? 0) % 20 || 1),
              level: apt.patient_notes?.slice(0, 40) ?? "No notes",
              color: colors[idx % colors.length],
            };
          })
      );

      const patientIds = new Set(appointments.map((apt) => apt.patient_id));
      setUniquePatients(patientIds.size);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newPatients = new Set(
        appointments
          .filter((apt) => new Date(apt.created_at) >= weekAgo)
          .map((apt) => apt.patient_id)
      );
      setNewPatientsThisWeek(newPatients.size);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const earnedPayments = payments.filter(isDoctorNetEarning);
      const monthPayments = earnedPayments.filter(
        (p) => new Date(p.created_at) >= monthStart
      );
      setMonthlyEarnings(
        monthPayments.reduce((sum, p) => sum + Number(p.doctor_earning), 0)
      );

      setWallet({
        disbursable: earnedPayments
          .filter((p) => p.payout_status === "paid")
          .reduce((sum, p) => sum + Number(p.doctor_earning), 0),
        pending: earnedPayments
          .filter((p) => p.payout_status !== "paid")
          .reduce((sum, p) => sum + Number(p.doctor_earning), 0),
      });

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const chartDays: Array<{ name: string; amount: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = toLocalDateKey(date);
        const amount = earnedPayments
          .filter((p) => p.created_at.split("T")[0] === key)
          .reduce((sum, p) => sum + Number(p.doctor_earning), 0);
        chartDays.push({ name: dayNames[date.getDay()], amount });
      }
      setEarningsData(chartDays);

      const weekDays: Array<{ day: string; date: string; sessions: number }> = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const key = toLocalDateKey(date);
        const count = appointments.filter(
          (apt) =>
            toLocalDateKey(new Date(apt.scheduled_at)) === key &&
            apt.status !== "cancelled"
        ).length;
        weekDays.push({
          day: dayNames[date.getDay()],
          date: date.getDate().toString().padStart(2, "0"),
          sessions: count,
        });
      }
      setWeekSchedule(weekDays);

      setRecentActivity(
        contextNotifications.slice(0, 5).map((n) => ({
          id: n.id,
          text: `${n.title}: ${n.message}`,
          time: timeAgo(n.created_at),
        }))
      );

      if (documents.practice_tasks?.length) {
        setTasks(documents.practice_tasks);
      }
    } catch {
      showToast("Failed to load dashboard data.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [doctorProfile.id, profile.id]);

  useAppointmentSessionSync(Boolean(doctorProfile.id), () => {
    loadDashboardData(true);
  });

  // Live-sync wallet when admin settles a payout.
  usePaymentsRealtime({ doctorId: doctorProfile.id, onChange: loadDashboardData });

  const todaySessions = useMemo(
    () => sessions.filter((s) => isToday(s.scheduledAt)),
    [sessions]
  );

  const stats = [
    {
      title: "Today's Appointments",
      value: `${todaySessions.filter((s) => !s.completed).length} Consultations`,
      description:
        todaySessions.length > 0
          ? `First session at ${formatTime(todaySessions[0].scheduledAt)}`
          : "No sessions scheduled today",
      icon: Clock,
      color: "text-indigo-500 bg-indigo-500/10",
    },
    {
      title: "Total Unique Patients",
      value: `${uniquePatients} Active`,
      description: `+${newPatientsThisWeek} new this week`,
      icon: Users,
      color: "text-brand-400 bg-brand-400/10",
    },
    {
      title: "Monthly Earnings",
      value: formatCurrency(monthlyEarnings),
      description: "From completed payments this month",
      icon: DollarSign,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      title: "Average Rating",
      value: `${doctorProfile.rating.toFixed(1)}/5.0`,
      description: `Based on ${doctorProfile.total_reviews} reviews`,
      icon: Star,
      color: "text-amber-500 bg-amber-500/10",
    },
  ];

  const quickActions = [
    {
      title: "Set Availability",
      description: "Manage weekly schedule slots and dates",
      href: "/doctor/schedule",
      icon: Clock,
      actionText: "Update Schedule",
    },
    {
      title: "Patient History",
      description: "View past prescriptions, diagnoses, and files",
      href: "/doctor/patients",
      icon: Users,
      actionText: "View Registry",
    },
    {
      title: "Earnings Report",
      description: "Track online payouts and total revenue",
      href: "/doctor/earnings",
      icon: DollarSign,
      actionText: "View Finances",
    },
  ];

  // Keep activity feed in sync with context notifications (live updates)
  useEffect(() => {
    setRecentActivity(
      contextNotifications.slice(0, 5).map((n) => ({
        id: n.id,
        text: `${n.title}: ${n.message}`,
        time: timeAgo(n.created_at),
      }))
    );
  }, [contextNotifications]);

  const recentActivityFeed = recentActivity;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const startConsultation = (session: DashboardSession, e: React.MouseEvent) => {
    e.stopPropagation();
    // The secure video page marks the appointment ongoing and joins as host.
    router.push(`/video/${session.id}`);
  };

  const openNotesModal = (session: DashboardSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotesSession(session);
    setClinicalNoteInput(session.notes || "");
    setMedicationInput(session.prescription?.medication || "");
    setDosageInput(session.prescription?.dosage || "");
    setShowNotesModal(true);
  };

  const saveNotesAndPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesSession) return;

    try {
      await saveClinicalRecords(
        notesSession.id,
        clinicalNoteInput,
        medicationInput
          ? { medication: medicationInput, dosage: dosageInput }
          : null
      );
      setShowNotesModal(false);
      showToast("Clinical notes and prescription record saved.");
      await loadDashboardData();
    } catch {
      showToast("Failed to save clinical records.");
    }
  };

  const toggleTask = async (id: number) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    try {
      const result = await updateDoctorDocuments(doctorProfile.id, documents, {
        practice_tasks: updated,
      });
      setDocuments(result.documents);
      showToast("Practice checklist updated.");
    } catch {
      showToast("Failed to save checklist.");
    }
  };

  const requestEarlyPayout = () => {
    showToast("Early disbursal requests are reviewed by finance within 24 hours.");
  };

  const saveQuickNote = async () => {
    if (!quickNote.trim()) return;
    const updatedTasks = [
      { id: Date.now(), text: quickNote.trim(), completed: false },
      ...tasks,
    ];
    setTasks(updatedTasks);
    try {
      const result = await updateDoctorDocuments(doctorProfile.id, documents, {
        practice_tasks: updatedTasks,
      });
      setDocuments(result.documents);
      showToast("Quick clinical reminder saved.");
      setShowQuickNote(false);
      setQuickNote("");
    } catch {
      showToast("Failed to save quick note.");
    }
  };

  const filteredSessions = sessions.filter((s) =>
    activeTab === "upcoming" ? !s.completed : s.completed
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium border border-slate-800 animate-in slide-in-from-right duration-200">
          <Check className="h-4 w-4 text-brand-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 to-brand-300 p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="flex items-start gap-4">
            <UserAvatar
              name={profile.full_name}
              avatarUrl={profile.avatar_url}
              size="lg"
              ring
              className="border-white/30 bg-white/10 text-white shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 fill-white text-brand-500" />
              PMDC-{doctorProfile.pmdc_number} Verified
            </span>
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-200"></span>
            </span>
          </div>
          <h2 className="text-2xl font-bold md:text-3xl">
            Welcome Back, {profile.full_name}
          </h2>
          <p className="text-white/85 text-sm leading-relaxed">
            Your clinical room is open. You have {todaySessions.filter((s) => !s.completed).length} consultations scheduled on your agenda today.
          </p>
            </div>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 hidden lg:flex items-center justify-center w-1/3 opacity-20 pointer-events-none">
          <Brain className="h-44 w-44 text-white animate-pulse" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-lg p-2 ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Consultations List */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4">
              <div>
                <CardTitle>Clinical Consultation Queue</CardTitle>
                <CardDescription>Launch call rooms or add clinical records</CardDescription>
              </div>
              <div className="flex bg-muted p-1 rounded-lg mt-3 sm:mt-0">
                <button
                  onClick={() => setActiveTab("upcoming")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeTab === "upcoming" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Upcoming ({sessions.filter(s => !s.completed).length})
                </button>
                <button
                  onClick={() => setActiveTab("completed")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeTab === "completed" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Completed ({sessions.filter(s => s.completed).length})
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredSessions.length > 0 ? filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-border overflow-visible transition-all duration-200 hover:shadow-sm"
                >
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-accent/40 cursor-pointer transition-all duration-200"
                    onClick={() =>
                      setExpandedSession(
                        expandedSession === session.id ? null : session.id
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={session.patientName}
                        avatarUrl={session.patientAvatarUrl}
                        size="sm"
                        className={session.completed ? "opacity-80" : ""}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{session.patientName}</h4>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              session.status === "Ready" || session.status === "Starting Soon"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : session.status === "Expired" || session.status === "Expired / No Show"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                                  : session.status === "Completed"
                                    ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.time}
                          </span>
                          <span>{session.type}</span>
                        </div>
                        <AppointmentSessionAlert timing={session.timing} className="mt-2" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                      {!session.completed && session.canStartCall && (
                        <>
                          <Button
                            size="sm"
                            className="flex items-center gap-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs"
                            onClick={(e) => startConsultation(session, e)}
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>Start call</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Complete session notes"
                            className="text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                            onClick={(e) => openNotesModal(session, e)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {!session.completed && !session.canStartCall && session.rawStatus === "scheduled" && (
                        <span className="text-[10px] font-semibold text-rose-600 px-2 py-1 rounded-md bg-rose-50 border border-rose-200">
                          Join window closed
                        </span>
                      )}
                      {session.completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 font-semibold text-xs text-brand-500 hover:bg-brand-50 cursor-pointer"
                          onClick={(e) => openNotesModal(session, e)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Edit Notes/Rx</span>
                        </Button>
                      )}
                      <button
                        className="p-1 hover:bg-muted rounded-full cursor-pointer ml-1"
                        onClick={() =>
                          setExpandedSession(
                            expandedSession === session.id ? null : session.id
                          )
                        }
                      >
                        {expandedSession === session.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>

                  {expandedSession === session.id && (
                    <div className="p-4 border-t border-border bg-muted/30 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">
                            Patient Metadata
                          </span>
                          <p className="text-sm mt-1">
                            {session.patientAge ?? "—"} years • {session.patientGender}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Last consultation: {session.lastVisit}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">
                            Consultation Record
                          </span>
                          <p className="text-sm mt-1">{session.notes}</p>
                          {session.prescription && (
                            <div className="mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 rounded-lg text-xs">
                              <p className="font-semibold text-emerald-800 dark:text-emerald-400">Prescription: {session.prescription.medication}</p>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">Dosage: {session.prescription.dosage}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Link href={`/doctor/patients`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                            Open Full Patient Registry
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-xl bg-muted/20">
                  <CheckCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <h4 className="font-medium text-sm">No {activeTab} sessions</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeTab === 'upcoming' ? "You're all caught up for now!" : "No completed sessions yet today."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Mood Trends (Stress Saviours Thematic Metric Panel) */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mood & Anxiety Intake Log</CardTitle>
                  <CardDescription>Latest scores submitted by today's patients</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Active
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {patientMoods.length > 0 ? patientMoods.map((mood, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${mood.color}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase opacity-80">{mood.name}</p>
                      <div className="h-2 w-2 rounded-full opacity-75" style={{ backgroundColor: mood.color.split(' ').find(c => c.includes('text'))?.replace('text-', '').replace('bg-', '') === 'emerald' ? '#10b981' : 
                        mood.color.includes('amber') ? '#f59e0b' : '#f43f5e' }} />
                    </div>
                    <p className="text-3xl font-extrabold tracking-tight">{mood.value}</p>
                    <div className="mt-3 pt-2 border-t border-black/5">
                      <p className="text-[11px] font-medium">{mood.type}</p>
                      <p className="text-[10px] font-semibold opacity-80 mt-0.5">{mood.level}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground col-span-3 text-center py-6">
                    No patient intake notes submitted for today yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Earnings Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Weekly Earnings</CardTitle>
                <CardDescription>Revenue over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={earningsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => `₨${value / 1000}k`} />
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(20, 184, 166, 0.1)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`PKR ${Number(value ?? 0)}`, "Earnings"]}
                      />
                      <Bar dataKey="amount" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Week Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>This Week's Schedule</CardTitle>
                <CardDescription>Overview of your upcoming availability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between gap-1 sm:gap-2">
                  {weekSchedule.map((day) => (
                    <div
                      key={day.day}
                      className={`flex-1 rounded-xl p-2 sm:p-3 text-center ${day.sessions > 0
                          ? "bg-brand-50 dark:bg-brand-800/20 border border-brand-100 dark:border-brand-700"
                          : "bg-muted/30 border border-border"
                        }`}
                    >
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{day.day}</p>
                      <p className="text-sm sm:text-lg font-bold mt-1">{day.date}</p>
                      {day.sessions > 0 && (
                        <div className="mt-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-400 text-white text-[10px]">
                          {day.sessions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions & Recent Activity Sidebars */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Payout & Wallet Ledger Widget */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Wallet Ledger</CardTitle>
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-xl border">
                <div>
                  <p className="text-muted-foreground">Cleared</p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(wallet.disbursable)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending Settlement</p>
                  <p className="text-sm font-bold text-amber-600 mt-0.5">{formatCurrency(wallet.pending)}</p>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>Cleared payouts update live</span>
                <span className="font-semibold text-foreground">Synced with admin</span>
              </div>
              <Button onClick={requestEarlyPayout} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-4">
                Request Early Disbursal
              </Button>
            </CardContent>
          </Card>

          {/* Interactive Checklist tasks */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Practice Task Checklist</CardTitle>
                <CheckCircle className="h-4 w-4 text-brand-500" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors text-xs font-medium text-foreground cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-400 cursor-pointer"
                    />
                    <span className={task.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                      {task.text}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Note Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Clinical Note</CardTitle>
              <CardDescription>Jot down important reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!showQuickNote ? (
                <Button
                  variant="outline"
                  className="w-full justify-start text-left text-muted-foreground text-xs"
                  onClick={() => setShowQuickNote(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add a quick note...
                </Button>
              ) : (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <textarea
                    className="w-full min-h-[100px] rounded-lg border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition-shadow"
                    placeholder="Type your note here..."
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuickNote(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-brand-500 hover:bg-brand-600 text-white font-semibold"
                      onClick={saveQuickNote}
                    >
                      Save Note
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Management links for doctor workflow</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <Link key={i} href={action.href} className="group">
                    <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-brand-400/10 p-2 text-brand-500 group-hover:scale-105 transition-transform duration-200">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold leading-none">{action.title}</p>
                          <p className="text-xs text-muted-foreground mt-1.5">{action.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your practice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivityFeed.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 rounded-full p-2 bg-brand-500/10 text-brand-500`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs leading-snug">{activity.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Clinical Notes & Prescription Writer Modal */}
      {showNotesModal && notesSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-lg w-full shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Clinical Records Writer</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Session: {notesSession.patientName} • {notesSession.type}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowNotesModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={saveNotesAndPrescription} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Clinical Therapy Notes</label>
                <textarea
                  required
                  rows={4}
                  value={clinicalNoteInput}
                  onChange={(e) => setClinicalNoteInput(e.target.value)}
                  placeholder="Record summary observations, anxiety/stress level assessments, and recommended CBT tasks..."
                  className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all resize-none"
                />
              </div>

              <div className="border-t border-border/60 pt-3">
                <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-brand-500" />
                  Prescription Writer (Optional)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Medication Name</label>
                    <input
                      type="text"
                      value={medicationInput}
                      onChange={(e) => setMedicationInput(e.target.value)}
                      placeholder="e.g. Sertraline 50mg"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Dosage Instructions</label>
                    <input
                      type="text"
                      value={dosageInput}
                      onChange={(e) => setDosageInput(e.target.value)}
                      placeholder="e.g. Once daily after dinner"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border/60">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowNotesModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold">
                  Save Clinical Records
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
