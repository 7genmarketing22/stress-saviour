"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Video, Clock, Search, Calendar, User, ChevronLeft, ChevronRight,
  XCircle, Download, CheckCircle2, Eye, MessageSquare, DollarSign, 
  Activity, AlertCircle, Phone, ArrowUpRight, BarChart3, FileText
} from "lucide-react";
import {
  ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, CartesianGrid
} from "recharts";

interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  duration: string;
  type: "Video" | "Audio" | "Chat";
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled" | "No Show";
  reason: string;
  notes: string;
  roomUrl: string;
  amount: number;
  platformFee: number;
  createdAt: string;
}

export default function AdminAppointmentsPage() {
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Completed" | "Cancelled" | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const itemsPerPage = 10;

  const [appointments] = useState<Appointment[]>([
    {
      id: "APT-9821",
      doctorId: "DR-4856",
      doctorName: "Dr. Ayesha Khan",
      doctorSpecialty: "Clinical Psychologist",
      patientId: "PT-123",
      patientName: "Saim Salman",
      patientPhone: "+92 347 6894686",
      date: "2026-06-22",
      time: "17:00",
      duration: "30 min",
      type: "Video",
      status: "Confirmed",
      reason: "Follow-up for anxiety management",
      notes: "",
      roomUrl: "https://meet.google.com/abc-defg-hij",
      amount: 2500,
      platformFee: 250,
      createdAt: "2026-06-18T14:30:00Z"
    },
    {
      id: "APT-1290",
      doctorId: "DR-1248",
      doctorName: "Dr. Bilal Ahmed",
      doctorSpecialty: "Psychiatrist",
      patientId: "PT-456",
      patientName: "Ali Raza",
      patientPhone: "+92 300 1234567",
      date: "2026-06-25",
      time: "11:00",
      duration: "45 min",
      type: "Audio",
      status: "Pending",
      reason: "Initial consultation for stress management",
      notes: "",
      roomUrl: "",
      amount: 3500,
      platformFee: 350,
      createdAt: "2026-06-20T10:15:00Z"
    },
    {
      id: "APT-4523",
      doctorId: "DR-9654",
      doctorName: "Dr. Farah Jamil",
      doctorSpecialty: "Therapist",
      patientId: "PT-789",
      patientName: "Zainab Malik",
      patientPhone: "+92 311 5556667",
      date: "2026-06-15",
      time: "14:00",
      duration: "30 min",
      type: "Video",
      status: "Completed",
      reason: "Anxiety management session",
      notes: "",
      roomUrl: "",
      amount: 2000,
      platformFee: 200,
      createdAt: "2026-06-10T09:45:00Z"
    }
  ]);

  const getFilteredAppointments = () => {
    let filtered = [...appointments];
    
    if (activeTab !== "All") {
      filtered = filtered.filter(apt => apt.status === activeTab || 
        (activeTab === "Upcoming" && ["Confirmed", "Pending"].includes(apt.status)));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.doctorName.toLowerCase().includes(query) ||
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

  const totalRevenue = filteredAppointments.reduce((sum, apt) => apt.status === "Completed" ? sum + apt.platformFee : sum, 0);
  const completedCount = filteredAppointments.filter(apt => apt.status === "Completed").length;
  const upcomingCount = filteredAppointments.filter(apt => ["Confirmed", "Pending"].includes(apt.status)).length;
  const cancelledCount = filteredAppointments.filter(apt => apt.status === "Cancelled").length;
  const noShowCount = filteredAppointments.filter(apt => apt.status === "No Show").length;
  const avgSessionValue = completedCount > 0 ? totalRevenue / completedCount : 0;

  const appointmentsByType = {
    Video: appointments.filter(a => a.type === "Video").length,
    Audio: appointments.filter(a => a.type === "Audio").length,
    Chat: appointments.filter(a => a.type === "Chat").length
  };

  const dailyStats = [
    { day: "Mon", appointments: 12, revenue: 4200 },
    { day: "Tue", appointments: 15, revenue: 5250 },
    { day: "Wed", appointments: 11, revenue: 3850 },
    { day: "Thu", appointments: 18, revenue: 6300 },
    { day: "Fri", appointments: 20, revenue: 7000 },
    { day: "Sat", appointments: 14, revenue: 4900 },
    { day: "Sun", appointments: 8, revenue: 2800 }
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">All Appointments</h1>
          <p className="text-sm text-slate-600 mt-1">Monitor and manage all appointments on the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{filteredAppointments.length}</h3>
                <p className="text-xs text-slate-500 mt-2">All appointments</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Upcoming</p>
                <h3 className="text-3xl font-semibold text-amber-600 mt-2">{upcomingCount}</h3>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <span className="text-green-600 font-medium flex items-center">
                    <ArrowUpRight className="h-3 w-3" />
                    +12%
                  </span>
                  <span className="text-slate-500">vs last week</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed</p>
                <h3 className="text-3xl font-semibold text-green-600 mt-2">{completedCount}</h3>
                <p className="text-xs text-slate-500 mt-2">{((completedCount / filteredAppointments.length) * 100).toFixed(0)}% completion rate</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Revenue</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">₨{(totalRevenue / 1000).toFixed(0)}k</h3>
                <p className="text-xs text-slate-500 mt-2">Avg ₨{avgSessionValue.toFixed(0)} per session</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Issues</p>
                <h3 className="text-3xl font-semibold text-red-600 mt-2">{cancelledCount + noShowCount}</h3>
                <p className="text-xs text-slate-500 mt-2">{cancelledCount} cancelled, {noShowCount} no-show</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Performance Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Weekly Performance</CardTitle>
                  <CardDescription>Daily appointments and revenue</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>


          {/* Controls */}
          <Card>
            <CardHeader className="border-b border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by doctor, patient, or reason..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["Upcoming", "Completed", "Cancelled", "All"].map((tab) => (
                    <Button
                      key={tab}
                      size="sm"
                      variant={activeTab === tab ? "default" : "outline"}
                      onClick={() => { setActiveTab(tab as any); setCurrentPage(1); }}
                      className="capitalize"
                    >
                      {tab}
                      {tab !== "All" && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-background rounded">
                          {tab === "Upcoming" ? upcomingCount : 
                           tab === "Completed" ? completedCount :
                           cancelledCount}
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
                      <div className="flex-shrink-0">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                          apt.type === "Video" ? "bg-blue-100" :
                          apt.type === "Audio" ? "bg-purple-100" : "bg-green-100"
                        }`}>
                          {apt.type === "Video" ? <Video className="h-5 w-5 text-blue-600" /> :
                           apt.type === "Audio" ? <Phone className="h-5 w-5 text-purple-600" /> :
                           <MessageSquare className="h-5 w-5 text-green-600" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-slate-500">{apt.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(apt.status)}`}>
                            {apt.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 flex-wrap">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{apt.doctorName}</p>
                            <p className="text-xs text-slate-600">with {apt.patientName}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(apt.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {apt.time}
                          </span>
                          <span>{apt.duration}</span>
                          <span className="font-medium text-green-600">₨{apt.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedAppointment(apt); setShowDetailsModal(true); }}>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1 text-sm text-slate-600">
                Page <span className="font-semibold text-slate-900 mx-1">{currentPage}</span> of <span className="font-semibold text-slate-900 mx-1">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Appointment Types */}
          <Card>
            <CardHeader>
              <CardTitle>By Type</CardTitle>
              <CardDescription>Consultation methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Video className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Video</p>
                    <p className="text-lg font-semibold text-slate-900">{appointmentsByType.Video}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50">
                    <Phone className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Audio</p>
                    <p className="text-lg font-semibold text-slate-900">{appointmentsByType.Audio}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Chat</p>
                    <p className="text-lg font-semibold text-slate-900">{appointmentsByType.Chat}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Updates</CardTitle>
              <CardDescription>Latest appointment activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentItems.slice(0, 5).map((apt, i) => (
                  <div key={i} className="flex items-start gap-3 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">{apt.doctorName} with {apt.patientName}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatDate(apt.date)} at {apt.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailsModal(false)}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">Appointment Details</CardTitle>
                  <CardDescription className="mt-1">ID: {selectedAppointment.id}</CardDescription>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetailsModal(false)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Participants */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Participants</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-slate-600" />
                      <div>
                        <p className="text-xs text-slate-600">Doctor</p>
                        <p className="font-semibold text-slate-900">{selectedAppointment.doctorName}</p>
                        <p className="text-xs text-slate-600">{selectedAppointment.doctorSpecialty}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-slate-600" />
                      <div>
                        <p className="text-xs text-slate-600">Patient</p>
                        <p className="font-semibold text-slate-900">{selectedAppointment.patientName}</p>
                        <p className="text-xs text-slate-600">{selectedAppointment.patientPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Info */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Appointment Information</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Date & Time</div>
                    <div className="font-medium text-sm mt-1">{formatDate(selectedAppointment.date)}</div>
                    <div className="text-xs text-slate-600 mt-1">{selectedAppointment.time} • {selectedAppointment.duration}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Type</div>
                    <div className="font-medium text-sm mt-1 flex items-center gap-2">
                      {selectedAppointment.type === "Video" && <Video className="h-4 w-4" />}
                      {selectedAppointment.type === "Audio" && <Phone className="h-4 w-4" />}
                      {selectedAppointment.type === "Chat" && <MessageSquare className="h-4 w-4" />}
                      {selectedAppointment.type}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Consultation Reason</h4>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{selectedAppointment.reason}</p>
              </div>

              {/* Financial */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Financial Details</h4>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                  <div className="flex items-center justify-between p-3">
                    <p className="text-sm text-slate-600">Consultation Fee</p>
                    <p className="font-semibold text-slate-900">₨{selectedAppointment.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <p className="text-sm text-slate-600">Platform Commission</p>
                    <p className="font-semibold text-green-600">₨{selectedAppointment.platformFee.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50">
                    <p className="text-sm font-semibold text-slate-900">Doctor Earnings</p>
                    <p className="font-bold text-slate-900">₨{(selectedAppointment.amount - selectedAppointment.platformFee).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button variant="outline" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  View Notes
                </Button>
                {selectedAppointment.status === "Confirmed" && (
                  <Button variant="outline" className="text-red-600 hover:bg-red-50">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
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
