"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Video,
  Clock,
  Search,
  Calendar,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock3,
  Plus,
  Filter,
  MoreHorizontal,
  FileText,
  Check,
  List,
  CalendarDays
} from "lucide-react";
import { useDoctor } from "@/contexts/DoctorContext";
import {
  getDoctorAppointments,
  saveClinicalRecords,
  startAppointmentCall,
  updateAppointment,
  updateDoctorDocuments,
} from "@/lib/doctor/api";
import { mapStatusToDb, mapToUIAppointment } from "@/lib/doctor/mappers";

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAge: string;
  patientGender: string;
  date: string;
  time: string;
  duration: string;
  type: "Video" | "Audio" | "Chat";
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled" | "No Show";
  reason: string;
  notes: string;
  roomUrl: string;
  prescription: any;
  createdAt: string;
}

export default function DoctorAppointmentsPage() {
  const { doctorProfile, documents, setDocuments } = useDoctor();
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Completed" | "Cancelled" | "All">("Upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [isLoading, setIsLoading] = useState(true);
  
  const today = new Date().toISOString().split("T")[0];
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(today);

  const [newDateInput, setNewDateInput] = useState("");
  const [newTimeInput, setNewTimeInput] = useState("");

  const [blockTimeForm, setBlockTimeForm] = useState({
    date: today,
    timeStart: "09:00",
    timeEnd: "10:00",
    reason: "Lunch/Break"
  });

  const [toastMessage, setToastMessage] = useState("");
  const itemsPerPage = 6;
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const data = await getDoctorAppointments(doctorProfile.id);
      setAppointments(data.map(mapToUIAppointment));
    } catch {
      showToast("Failed to load appointments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [doctorProfile.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const getFilteredAppointments = () => {
    let filtered = [...appointments];
    
    if (activeTab !== "All") {
      filtered = filtered.filter(apt => apt.status === activeTab || 
        (activeTab === "Upcoming" && ["Confirmed", "Pending"].includes(apt.status)));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.patientName.toLowerCase().includes(query) ||
        apt.id.toLowerCase().includes(query) ||
        apt.reason.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAppointments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const handleStatusChange = async (id: string, newStatus: Appointment["status"]) => {
    try {
      const dbStatus = mapStatusToDb(newStatus);
      await updateAppointment(id, {
        status: dbStatus,
        ...(dbStatus === "cancelled"
          ? { cancellation_reason: "Cancelled by doctor" }
          : {}),
      });
      showToast(`Appointment status updated to ${newStatus}.`);
      await loadAppointments();
    } catch {
      showToast("Failed to update appointment status.");
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !newDateInput || !newTimeInput) return;

    try {
      const scheduledAt = new Date(`${newDateInput}T${newTimeInput}:00`).toISOString();
      await updateAppointment(selectedAppointment.id, {
        scheduled_at: scheduledAt,
        status: "scheduled",
      });
      setShowRescheduleModal(false);
      setNewDateInput("");
      setNewTimeInput("");
      showToast("Appointment successfully rescheduled.");
      await loadAppointments();
    } catch {
      showToast("Failed to reschedule appointment.");
    }
  };

  const handleBlockTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const blocked = documents.blocked_dates ?? [];
      const updated = [
        ...blocked,
        {
          id: `bl-${Date.now()}`,
          date: blockTimeForm.date,
          reason: blockTimeForm.reason || "Blocked by doctor",
        },
      ];
      const result = await updateDoctorDocuments(doctorProfile.id, documents, {
        blocked_dates: updated,
      });
      setDocuments(result.documents);
      showToast(`Time slot successfully blocked on ${blockTimeForm.date}.`);
      setShowBlockTimeModal(false);
    } catch {
      showToast("Failed to block time slot.");
    }
  };

  const handleJoinCall = async (apt: Appointment) => {
    try {
      const updated = await startAppointmentCall(apt.id, apt.roomUrl || undefined);
      const roomUrl = (updated as { video_room_url: string | null }).video_room_url ?? apt.roomUrl;
      if (roomUrl) window.open(roomUrl, "_blank", "noopener,noreferrer");
      showToast(`Joining call with ${apt.patientName}.`);
      await loadAppointments();
    } catch {
      showToast("Failed to start video call.");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusBadgeClass = (status: string) => {
    const classes = {
      Confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      Completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      "No Show": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    };
    return classes[status as keyof typeof classes] || "bg-gray-100 text-gray-800";
  };

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Appointments Console</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your consultation schedule, join telehealth calls, and update booking statuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggles */}
          <div className="flex bg-muted p-1 rounded-lg border border-border mr-2">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "list" ? "bg-card text-brand-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "calendar" ? "bg-card text-brand-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>

          <Button className="bg-brand-500 hover:bg-brand-600 text-white font-semibold" onClick={() => setShowBlockTimeModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Block Time
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patient, ID, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                {["Upcoming", "Completed", "Cancelled", "All"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab as any); setCurrentPage(1); }}
                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === tab
                        ? "bg-brand-500 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="space-y-4">
            {currentItems.length > 0 ? (
              currentItems.map((apt) => (
                <Card key={apt.id} className="overflow-visible hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-800/30 dark:text-brand-300 font-bold text-sm">
                          {apt.patientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-lg text-foreground">{apt.patientName}</h3>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{apt.id}</span>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(apt.status)}`}>
                              {apt.status}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-brand-500 dark:text-brand-300">{apt.type} Consultation • {apt.duration}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(apt.date)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {apt.time}
                            </span>
                            {apt.patientPhone && (
                              <span className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                {apt.patientPhone}
                              </span>
                            )}
                          </div>
                          {apt.reason && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium text-foreground">Reason: </span>
                              {apt.reason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        {["Confirmed", "Pending"].includes(apt.status) && (
                          <Button
                            className="bg-brand-500 hover:bg-brand-600 text-white w-full sm:w-auto font-semibold"
                            onClick={() => handleJoinCall(apt)}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Join Call
                          </Button>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5"
                            onClick={() => { setSelectedAppointment(apt); setShowDetailsModal(true); }}
                          >
                            <User className="h-3.5 w-3.5" />
                            Details
                          </Button>
                          
                          {/* DROPDOWN CONTAINER MUST BE OVERFLOW-VISIBLE */}
                          <div className="relative group">
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            
                            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                              <div className="p-2 space-y-1">
                                {apt.status === "Pending" && (
                                  <button
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-emerald-600 text-left font-semibold cursor-pointer"
                                    onClick={() => { setSelectedAppointment(apt); setShowConfirmModal(true); }}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Confirm Appointment
                                  </button>
                                )}
                                {["Confirmed", "Pending"].includes(apt.status) && (
                                  <>
                                    <button
                                      className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-amber-600 text-left font-semibold cursor-pointer"
                                      onClick={() => { setSelectedAppointment(apt); setShowRescheduleModal(true); }}
                                    >
                                      <Clock3 className="h-4 w-4" />
                                      Reschedule
                                    </button>
                                    <button
                                      className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-red-600 text-left font-semibold cursor-pointer"
                                      onClick={() => { setSelectedAppointment(apt); setShowCancelModal(true); }}
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Cancel
                                    </button>
                                  </>
                                )}
                                <button
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-brand-500 text-left font-semibold cursor-pointer"
                                  onClick={() => { setSelectedAppointment(apt); setShowAddNoteModal(true); }}
                                >
                                  <FileText className="h-4 w-4" />
                                  Add Note
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="py-16 text-center border border-dashed rounded-xl bg-card">
                <Calendar className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
                <h4 className="font-semibold text-lg">No appointments found</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  {searchQuery ? "No appointments match your search filters." : "You have no appointments in this category."}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                Page <span className="font-semibold text-foreground mx-1">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        /* CALENDAR AGENDA MODE */
        <div className="grid gap-6 md:grid-cols-12">
          {/* Day Picker column */}
          <div className="md:col-span-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm text-foreground">Select Calendar Date</h3>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <span key={i} className="text-muted-foreground font-semibold py-1">{d}</span>
                  ))}
                  {[22, 23, 24, 25, 26, 27, 28].map((day) => {
                    const fullDate = `2026-06-${day}`;
                    const isSelected = selectedCalendarDate === fullDate;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedCalendarDate(fullDate)}
                        className={`h-8 w-8 mx-auto rounded-lg font-medium flex items-center justify-center transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-brand-500 text-white shadow-sm"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  Showing agenda for <span className="font-bold text-foreground">{formatDate(selectedCalendarDate)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline column */}
          <div className="md:col-span-8 space-y-4">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-border/60 pb-3">
                  <h3 className="font-bold text-base text-foreground">Daily Clinical Timeline</h3>
                  <span className="text-xs text-muted-foreground">{formatDate(selectedCalendarDate)}</span>
                </div>

                <div className="relative border-l-2 border-border/60 pl-6 ml-3 space-y-6">
                  {/* Mock morning block */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-border bg-card" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">09:00 AM</p>
                      <p className="text-sm text-foreground mt-0.5">Clinical Rounds & Admin Tasks</p>
                    </div>
                  </div>

                  {/* Filter appointments matching selected calendar date */}
                  {appointments.filter(a => a.date === selectedCalendarDate).length > 0 ? (
                    appointments.filter(a => a.date === selectedCalendarDate).map((apt) => (
                      <div key={apt.id} className="relative group hover:bg-muted/10 p-3 rounded-lg border border-transparent hover:border-border transition-colors">
                        <div className="absolute -left-[31px] top-4.5 h-4 w-4 rounded-full border-2 border-brand-500 bg-card" />
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-brand-500">{apt.time}</p>
                            <h4 className="font-semibold text-sm text-foreground mt-1">{apt.patientName} ({apt.type})</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Reason: {apt.reason}</p>
                          </div>
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusBadgeClass(apt.status)}`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="relative py-8 text-center text-xs text-muted-foreground">
                      <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-border bg-card" />
                      No consultations scheduled on this day.
                    </div>
                  )}

                  {/* Mock afternoon block */}
                  <div className="relative text-xs">
                    <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-border bg-card" />
                    <div>
                      <p className="font-semibold text-muted-foreground">06:00 PM</p>
                      <p className="text-foreground mt-0.5">End of Day Logs</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Block Time Modal */}
      {showBlockTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-sm w-full shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Block Calendar Time</h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowBlockTimeModal(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleBlockTimeSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date</label>
                <input
                  type="date"
                  required
                  value={blockTimeForm.date}
                  onChange={(e) => setBlockTimeForm({ ...blockTimeForm, date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Start Time</label>
                  <input
                    type="time"
                    required
                    value={blockTimeForm.timeStart}
                    onChange={(e) => setBlockTimeForm({ ...blockTimeForm, timeStart: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">End Time</label>
                  <input
                    type="time"
                    required
                    value={blockTimeForm.timeEnd}
                    onChange={(e) => setBlockTimeForm({ ...blockTimeForm, timeEnd: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Block Reason</label>
                <input
                  type="text"
                  required
                  value={blockTimeForm.reason}
                  onChange={(e) => setBlockTimeForm({ ...blockTimeForm, reason: e.target.value })}
                  placeholder="e.g. Lunch/Break or Clinic closed"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowBlockTimeModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold">
                  Block Time
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-lg font-bold">Appointment Details</h3>
                <p className="text-sm text-muted-foreground font-mono">{selectedAppointment.id}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowDetailsModal(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Patient</p>
                  <p className="font-semibold text-base">{selectedAppointment.patientName}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{selectedAppointment.patientEmail}</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.patientPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Appointment</p>
                  <p className="font-medium">{formatDate(selectedAppointment.date)} at {selectedAppointment.time}</p>
                  <p className="text-sm mt-0.5">{selectedAppointment.type} • {selectedAppointment.duration}</p>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mt-2 ${getStatusBadgeClass(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-sm text-foreground">{selectedAppointment.reason}</p>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted/40 p-3 rounded-lg border">{selectedAppointment.notes}</p>
                </div>
              )}

              {selectedAppointment.prescription && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prescription</p>
                  <div className="p-3 rounded-lg border border-border bg-emerald-50 dark:bg-emerald-900/10">
                    <p className="font-medium text-emerald-800 dark:text-emerald-300">{selectedAppointment.prescription.medication}</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">{selectedAppointment.prescription.dosage}</p>
                  </div>
                </div>
              )}

              {selectedAppointment.roomUrl && ["Confirmed", "Pending"].includes(selectedAppointment.status) && (
                <a href={selectedAppointment.roomUrl} target="_blank" rel="noreferrer" className="block w-full">
                  <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold">
                    <Video className="h-4 w-4 mr-2" />
                    Launch Telehealth Room
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Appointment Modal */}
      {showConfirmModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Confirm Appointment</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowConfirmModal(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to confirm this appointment with {selectedAppointment.patientName}?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
                  onClick={() => {
                    handleStatusChange(selectedAppointment.id, "Confirmed");
                    setShowConfirmModal(false);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Cancel Appointment</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowCancelModal(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to cancel this appointment with {selectedAppointment.patientName}?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelModal(false)}
                >
                  No, Keep
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                  onClick={() => {
                    handleStatusChange(selectedAppointment.id, "Cancelled");
                    setShowCancelModal(false);
                  }}
                >
                  Yes, Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Add Note</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowAddNoteModal(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <form className="p-6 space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const note = (e.target as HTMLFormElement & { note: { value: string } }).note.value;
              if (!selectedAppointment) return;
              try {
                await saveClinicalRecords(selectedAppointment.id, note, selectedAppointment.prescription, false);
                setShowAddNoteModal(false);
                showToast("Consultation note successfully saved.");
                await loadAppointments();
              } catch {
                showToast("Failed to save consultation note.");
              }
            }}>
              <div>
                <label className="text-sm font-medium mb-1 block">Note</label>
                <textarea
                  name="note"
                  rows={4}
                  defaultValue={selectedAppointment.notes}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  placeholder="Enter your notes here..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddNoteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
                >
                  Save Note
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Reschedule</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowRescheduleModal(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="p-6">
              <p className="text-sm text-muted-foreground mb-4">Select new date and time:</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date</label>
                  <input
                    type="date"
                    required
                    value={newDateInput}
                    onChange={(e) => setNewDateInput(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Time</label>
                  <input
                    type="time"
                    required
                    value={newTimeInput}
                    onChange={(e) => setNewTimeInput(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRescheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
                >
                  Reschedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
