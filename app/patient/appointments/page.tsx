"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Video, Clock, Search, Calendar, User, ChevronLeft, ChevronRight,
  XCircle, Plus, Filter, MoreHorizontal, X, Star, Loader2,
} from "lucide-react";
import {
  cancelPatientAppointment,
  getPatientAppointments,
  submitAppointmentReview,
} from "@/lib/patient/api";
import {
  formatDate,
  mapToPatientAppointment,
  type PatientUIAppointment,
} from "@/lib/patient/mappers";
import { UserAvatar } from "@/components/shared/UserAvatar";

export default function PatientAppointmentsPage() {
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Completed" | "Cancelled" | "All">("Upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<PatientUIAppointment | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [appointments, setAppointments] = useState<PatientUIAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 6;

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientAppointments();
      setAppointments(data.map(mapToPatientAppointment));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const getFilteredAppointments = () => {
    let filtered = [...appointments];

    if (activeTab === "Upcoming") {
      filtered = filtered.filter((apt) =>
        ["Confirmed", "Pending", "Ready"].includes(apt.status)
      );
    } else if (activeTab === "Completed") {
      filtered = filtered.filter((apt) => apt.status === "Completed");
    } else if (activeTab === "Cancelled") {
      filtered = filtered.filter((apt) =>
        ["Cancelled", "No Show"].includes(apt.status)
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.doctorName.toLowerCase().includes(query) ||
          apt.doctorSpecialization.toLowerCase().includes(query) ||
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

  const handleCancelAppointment = async (id: string) => {
    setActionLoading(true);
    try {
      await cancelPatientAppointment(id);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel appointment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || newRating < 1) return;
    setActionLoading(true);
    try {
      await submitAppointmentReview(
        selectedAppointment.id,
        selectedAppointment.doctorId,
        newRating,
        reviewComment
      );
      setShowReviewModal(false);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      Confirmed: "bg-emerald-100 text-emerald-800",
      Ready: "bg-cyan-100 text-cyan-800",
      Pending: "bg-amber-100 text-amber-800",
      Completed: "bg-blue-100 text-blue-800",
      Cancelled: "bg-red-100 text-red-800",
      "No Show": "bg-gray-100 text-gray-800",
    };
    return classes[status] ?? "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Appointments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your upcoming and past consultations with doctors.
          </p>
        </div>
        <Link href="/patient/doctors">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Book New Appointment
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search doctor, specialty, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(["Upcoming", "Completed", "Cancelled", "All"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {currentItems.length > 0 ? (
          currentItems.map((apt) => (
            <Card key={apt.id} className="overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <UserAvatar
                      name={apt.doctorName}
                      avatarUrl={apt.doctorAvatarUrl}
                      size="md"
                    />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-base">{apt.doctorName}</h3>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                          {apt.id.slice(0, 8)}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(apt.status)}`}>
                          {apt.status}
                        </span>
                        {apt.rating ? (
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i < apt.rating! ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium text-blue-600">
                        {apt.doctorSpecialization} • {apt.type} • {apt.duration}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(apt.date, { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {apt.timeRange}
                        </span>
                      </div>
                      {apt.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">Reason: </span>
                          {apt.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {["Confirmed", "Pending", "Ready"].includes(apt.status) && (
                      <a href={apt.roomUrl} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                          <Video className="h-4 w-4 mr-2" />
                          Join Consultation
                        </Button>
                      </a>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedAppointment(apt); setShowDetailsModal(true); }}
                      >
                        <User className="h-3.5 w-3.5 mr-1.5" />
                        Details
                      </Button>
                      <div className="relative group">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <div className="p-2 space-y-1">
                            {["Confirmed", "Pending", "Ready"].includes(apt.status) && (
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted text-red-600"
                                onClick={() => { setSelectedAppointment(apt); setShowCancelModal(true); }}
                              >
                                <XCircle className="h-4 w-4" />
                                Cancel Appointment
                              </button>
                            )}
                            {apt.status === "Completed" && (
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted text-amber-600"
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setNewRating(apt.rating ?? 0);
                                  setReviewComment(apt.reviewComment ?? "");
                                  setShowReviewModal(true);
                                }}
                              >
                                <Star className="h-4 w-4" />
                                {apt.rating ? "Edit Review" : "Leave Review"}
                              </button>
                            )}
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
              {searchQuery ? "No appointments match your search." : "You have no appointments in this category."}
            </p>
            <Link href="/patient/doctors">
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                Browse Doctors
              </Button>
            </Link>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-lg font-bold">Appointment Details</h3>
                <p className="text-xs text-muted-foreground">{selectedAppointment.id.slice(0, 8)}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowDetailsModal(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Doctor</p>
                  <p className="font-semibold">{selectedAppointment.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{selectedAppointment.doctorSpecialization}</p>
                  <p className="text-xs text-muted-foreground">{selectedAppointment.doctorPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Appointment</p>
                  <p className="font-medium">
                    {formatDate(selectedAppointment.date, { year: "numeric", month: "long", day: "numeric" })} at {selectedAppointment.timeRange}
                  </p>
                  <p className="text-sm">{selectedAppointment.type} • {selectedAppointment.duration}</p>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mt-2 ${getStatusBadgeClass(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-sm">{selectedAppointment.reason}</p>
              </div>
              {selectedAppointment.prescription && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prescription</p>
                  <div className="p-4 rounded-xl border bg-blue-50">
                    <p className="font-medium text-blue-800">{selectedAppointment.prescription.medication}</p>
                    <p className="text-sm text-blue-700">{selectedAppointment.prescription.dosage}</p>
                  </div>
                </div>
              )}
              {["Confirmed", "Pending", "Ready"].includes(selectedAppointment.status) && (
                <a href={selectedAppointment.roomUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Video className="h-4 w-4 mr-2" />
                    Join Consultation
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Cancel Appointment</h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowCancelModal(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Cancel your appointment with {selectedAppointment.doctorName}?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)} disabled={actionLoading}>
                  Keep
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={actionLoading}
                  onClick={async () => {
                    await handleCancelAppointment(selectedAppointment.id);
                    setShowCancelModal(false);
                  }}
                >
                  {actionLoading ? "Cancelling..." : "Yes, Cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Leave a Review</h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowReviewModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleSubmitReview}>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">Rating</label>
                <div className="flex items-center gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setNewRating(star)} className="focus:outline-none">
                      <Star className={`h-9 w-9 ${newRating >= star ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Your Review</label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Share your experience..."
                />
              </div>
              <div className="flex gap-3 pt-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowReviewModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={actionLoading || newRating < 1}>
                  {actionLoading ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
