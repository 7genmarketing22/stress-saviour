"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Video, Clock, Search, Calendar, User, ChevronLeft, ChevronRight,
  XCircle, CheckCircle2, Eye, MessageSquare, DollarSign, Activity,
  AlertCircle, RefreshCw, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, CartesianGrid,
} from "recharts";
import {
  getAdminAppointments,
  appointmentsByDay,
  updateAppointmentStatusAdmin,
} from "@/lib/admin/api";
import type { AdminAppointment } from "@/lib/admin/types";
import type { AppointmentStatus, AppointmentType } from "@/types";

const TYPE_LABEL: Record<AppointmentType, string> = {
  video: "Video",
  chat: "Chat",
  in_person: "In-Person",
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

function statusBadgeClass(status: AppointmentStatus) {
  const map: Record<AppointmentStatus, string> = {
    scheduled: "bg-amber-100 text-amber-800",
    ongoing: "bg-emerald-100 text-emerald-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-gray-100 text-gray-800",
  };
  return map[status];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function AdminAppointmentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);

  const [activeTab, setActiveTab] = useState<"Upcoming" | "Completed" | "Cancelled" | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<AdminAppointment | null>(null);
  const itemsPerPage = 8;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setAppointments(await getAdminAppointments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancel = async (id: string) => {
    setActionId(id);
    setError(null);
    try {
      await updateAppointmentStatusAdmin(id, "cancelled");
      await loadData();
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel appointment");
    } finally {
      setActionId(null);
    }
  };

  const weeklyData = useMemo(() => appointmentsByDay(appointments), [appointments]);

  const counts = {
    total: appointments.length,
    upcoming: appointments.filter((a) => a.status === "scheduled" || a.status === "ongoing").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
    noShow: appointments.filter((a) => a.status === "no_show").length,
  };

  const totalRevenue = appointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + Number(a.consultation_fee), 0);
  const avgSessionValue = counts.completed > 0 ? totalRevenue / counts.completed : 0;

  const filtered = appointments.filter((apt) => {
    if (activeTab === "Upcoming" && !(apt.status === "scheduled" || apt.status === "ongoing")) return false;
    if (activeTab === "Completed" && apt.status !== "completed") return false;
    if (activeTab === "Cancelled" && apt.status !== "cancelled" && apt.status !== "no_show") return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const doctorName = apt.doctor?.profile?.full_name?.toLowerCase() ?? "";
      const patientName = apt.patient?.full_name?.toLowerCase() ?? "";
      const reason = apt.patient_notes?.toLowerCase() ?? "";
      if (!doctorName.includes(q) && !patientName.includes(q) && !reason.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const typeCounts = {
    video: appointments.filter((a) => a.appointment_type === "video").length,
    chat: appointments.filter((a) => a.appointment_type === "chat").length,
    in_person: appointments.filter((a) => a.appointment_type === "in_person").length,
  };

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
          <h1 className="text-2xl font-semibold text-slate-900">All Appointments</h1>
          <p className="text-sm text-slate-600 mt-1">Monitor and manage every appointment on the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{counts.total}</h3>
                <p className="text-xs text-slate-500 mt-2">All appointments</p>
              </div>
              <div className="p-3 rounded-lg bg-teal-50"><Calendar className="h-5 w-5 text-teal-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Upcoming</p>
                <h3 className="text-3xl font-semibold text-amber-600 mt-2">{counts.upcoming}</h3>
                <p className="text-xs text-slate-500 mt-2">Scheduled & ongoing</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50"><Clock className="h-5 w-5 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed</p>
                <h3 className="text-3xl font-semibold text-green-600 mt-2">{counts.completed}</h3>
                <p className="text-xs text-slate-500 mt-2">
                  {counts.total ? ((counts.completed / counts.total) * 100).toFixed(0) : 0}% completion
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Revenue</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">₨{(totalRevenue / 1000).toFixed(1)}k</h3>
                <p className="text-xs text-slate-500 mt-2">Avg ₨{avgSessionValue.toFixed(0)} / session</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Issues</p>
                <h3 className="text-3xl font-semibold text-red-600 mt-2">{counts.cancelled + counts.noShow}</h3>
                <p className="text-xs text-slate-500 mt-2">{counts.cancelled} cancelled, {counts.noShow} no-show</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50"><AlertCircle className="h-5 w-5 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Performance</CardTitle>
              <CardDescription>Appointments over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                    <Bar dataKey="count" name="Appointments" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
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
                      placeholder="Search by doctor or patient..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(["Upcoming", "Completed", "Cancelled", "All"] as const).map((tab) => (
                    <Button
                      key={tab}
                      size="sm"
                      variant={activeTab === tab ? "default" : "outline"}
                      onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                    >
                      {tab}
                      {tab !== "All" && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-background rounded">
                          {tab === "Upcoming" ? counts.upcoming : tab === "Completed" ? counts.completed : counts.cancelled + counts.noShow}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {currentItems.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        apt.appointment_type === "video" ? "bg-blue-100" : apt.appointment_type === "chat" ? "bg-green-100" : "bg-purple-100"
                      }`}>
                        {apt.appointment_type === "video" ? <Video className="h-5 w-5 text-blue-600" /> :
                          apt.appointment_type === "chat" ? <MessageSquare className="h-5 w-5 text-green-600" /> :
                          <User className="h-5 w-5 text-purple-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-slate-500">#{apt.id.slice(0, 8)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(apt.status)}`}>
                            {STATUS_LABEL[apt.status]}
                          </span>
                        </div>
                        <div className="mt-1">
                          <p className="font-medium text-slate-900 text-sm">{apt.doctor?.profile?.full_name ?? "Doctor"}</p>
                          <p className="text-xs text-slate-600">with {apt.patient?.full_name ?? "Patient"}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(apt.scheduled_at)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(apt.scheduled_at)}</span>
                          <span>{apt.duration_minutes} min</span>
                          <span className="font-medium text-green-600">₨{Number(apt.consultation_fee).toLocaleString("en-PK")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => setSelected(apt)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {currentItems.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-900">No appointments found</p>
                    <p className="text-sm text-slate-600 mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <div className="flex items-center gap-1 text-sm text-slate-600">
                Page <span className="font-semibold text-slate-900 mx-1">{currentPage}</span> of <span className="font-semibold text-slate-900 mx-1">{totalPages}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>By Type</CardTitle>
              <CardDescription>Consultation methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50"><Video className="h-4 w-4 text-blue-600" /></div>
                  <p className="text-xs text-slate-600">Video</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{typeCounts.video}</p>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50"><MessageSquare className="h-4 w-4 text-green-600" /></div>
                  <p className="text-xs text-slate-600">Chat</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{typeCounts.chat}</p>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50"><User className="h-4 w-4 text-purple-600" /></div>
                  <p className="text-xs text-slate-600">In-Person</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{typeCounts.in_person}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Updates</CardTitle>
              <CardDescription>Latest appointment activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        {apt.doctor?.profile?.full_name ?? "Doctor"} with {apt.patient?.full_name ?? "Patient"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{formatDate(apt.scheduled_at)} at {formatTime(apt.scheduled_at)}</p>
                    </div>
                  </div>
                ))}
                {appointments.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No appointments yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">Appointment Details</CardTitle>
                  <CardDescription className="mt-1">ID: {selected.id.slice(0, 8)}</CardDescription>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(selected.status)}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-sm mb-3">Participants</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-lg flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-600">Doctor</p>
                      <p className="font-semibold text-slate-900">{selected.doctor?.profile?.full_name ?? "Doctor"}</p>
                      <p className="text-xs text-slate-600">{selected.doctor?.specialization ?? "—"}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-600">Patient</p>
                      <p className="font-semibold text-slate-900">{selected.patient?.full_name ?? "Patient"}</p>
                      <p className="text-xs text-slate-600">{selected.patient?.phone ?? selected.patient?.email ?? "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3">Appointment Information</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Date & Time</div>
                    <div className="font-medium text-sm mt-1">{formatDate(selected.scheduled_at)}</div>
                    <div className="text-xs text-slate-600 mt-1">{formatTime(selected.scheduled_at)} • {selected.duration_minutes} min</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Type</div>
                    <div className="font-medium text-sm mt-1">{TYPE_LABEL[selected.appointment_type]}</div>
                  </div>
                </div>
              </div>

              {selected.patient_notes && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Consultation Reason</h4>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{selected.patient_notes}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-sm mb-3">Financial Details</h4>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                  <div className="flex items-center justify-between p-3">
                    <p className="text-sm text-slate-600">Consultation Fee</p>
                    <p className="font-semibold text-slate-900">₨{Number(selected.consultation_fee).toLocaleString("en-PK")}</p>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <p className="text-sm text-slate-600">Platform Commission (10%)</p>
                    <p className="font-semibold text-teal-600">₨{Math.round(Number(selected.consultation_fee) * 0.1).toLocaleString("en-PK")}</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50">
                    <p className="text-sm font-semibold text-slate-900">Doctor Earnings</p>
                    <p className="font-bold text-slate-900">₨{Math.round(Number(selected.consultation_fee) * 0.9).toLocaleString("en-PK")}</p>
                  </div>
                </div>
              </div>

              {selected.cancellation_reason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div className="text-xs text-red-600 mb-1">Cancellation reason</div>
                  <div className="text-sm text-red-700">{selected.cancellation_reason}</div>
                </div>
              )}

              {(selected.status === "scheduled" || selected.status === "ongoing") && (
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    disabled={actionId === selected.id}
                    onClick={() => handleCancel(selected.id)}
                  >
                    {actionId === selected.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Cancel Appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
