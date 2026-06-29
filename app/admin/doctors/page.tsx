"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Search, Eye, Ban, CheckCircle, XCircle, Star, MapPin, Briefcase,
  Phone, Mail, Users, AlertTriangle, RefreshCw, Loader2,
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import {
  getAdminDoctors,
  getAdminAppointments,
  getAdminPayments,
  approveDoctor,
  rejectDoctor,
  suspendDoctor,
  reinstateDoctor,
} from "@/lib/admin/api";
import type { AdminAppointment, AdminDoctor, AdminPayment } from "@/lib/admin/types";
import type { DoctorStatus } from "@/types";

function formatPKR(value: number) {
  return `₨${Math.round(value).toLocaleString("en-PK")}`;
}

export default function AdminDoctorsPage() {
  const { profile } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DoctorStatus>("all");
  const [selectedDoctor, setSelectedDoctor] = useState<AdminDoctor | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docs, apts, pays] = await Promise.all([
        getAdminDoctors(),
        getAdminAppointments(),
        getAdminPayments(),
      ]);
      setDoctors(docs);
      setAppointments(apts);
      setPayments(pays);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load doctors");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statsByDoctor = useMemo(() => {
    const map = new Map<string, { consultations: number; earnings: number }>();
    for (const doc of doctors) map.set(doc.id, { consultations: 0, earnings: 0 });
    for (const apt of appointments) {
      if (apt.status !== "completed") continue;
      const entry = map.get(apt.doctor_id);
      if (entry) entry.consultations += 1;
    }
    for (const pay of payments) {
      if (pay.status !== "completed") continue;
      const entry = map.get(pay.doctor_id);
      if (entry) entry.earnings += Number(pay.doctor_earning);
    }
    return map;
  }, [doctors, appointments, payments]);

  const runAction = async (doctorId: string, fn: () => Promise<unknown>) => {
    setActionId(doctorId);
    setError(null);
    try {
      await fn();
      await loadData();
      setSelectedDoctor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const name = doc.profile?.full_name?.toLowerCase() ?? "";
    const spec = doc.specialization?.toLowerCase() ?? "";
    const city = doc.profile?.city?.toLowerCase() ?? "";
    const q = searchQuery.toLowerCase();
    const matchesSearch = name.includes(q) || spec.includes(q) || city.includes(q);
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: doctors.length,
    approved: doctors.filter((d) => d.status === "approved").length,
    pending: doctors.filter((d) => d.status === "pending").length,
    rejected: doctors.filter((d) => d.status === "rejected").length,
    suspended: doctors.filter((d) => d.status === "suspended").length,
    avgRating: (() => {
      const rated = doctors.filter((d) => Number(d.total_reviews) > 0);
      return rated.length ? rated.reduce((s, d) => s + Number(d.rating), 0) / rated.length : 0;
    })(),
  };

  const getStatusBadge = (status: DoctorStatus) => {
    const colors: Record<DoctorStatus, string> = {
      approved: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      rejected: "bg-red-100 text-red-700",
      suspended: "bg-gray-200 text-gray-700",
    };
    return colors[status];
  };

  const initials = (name?: string | null) =>
    (name ?? "Dr")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("");

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
          <h1 className="text-2xl font-semibold text-slate-900">Manage Doctors</h1>
          <p className="text-sm text-slate-600 mt-1">Review credentials and manage doctor accounts</p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Doctors</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{stats.total}</h3>
                <p className="text-xs text-slate-500 mt-2">{stats.approved} active</p>
              </div>
              <div className="p-3 rounded-lg bg-teal-50">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Approved</p>
                <h3 className="text-3xl font-semibold text-green-600 mt-2">{stats.approved}</h3>
                <p className="text-xs text-slate-500 mt-2">Active on platform</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Review</p>
                <h3 className="text-3xl font-semibold text-yellow-600 mt-2">{stats.pending}</h3>
                <p className="text-xs text-slate-500 mt-2">Awaiting approval</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Platform Rating</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <h3 className="text-3xl font-semibold text-slate-900">
                    {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
                  </h3>
                  {stats.avgRating > 0 && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-2">From rated doctors</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
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
                  placeholder="Search by name, specialization, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all", "approved", "pending", "rejected", "suspended"] as const).map((status) => (
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
                      {doctors.filter((d) => d.status === status).length}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-200">
            {filteredDoctors.map((doc) => {
              const docStats = statsByDoctor.get(doc.id);
              return (
                <div key={doc.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {initials(doc.profile?.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-slate-900">{doc.profile?.full_name ?? "Unnamed doctor"}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(doc.status)}`}>
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{doc.specialization}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {doc.profile?.city ?? (doc.cities?.[0] ?? "—")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {doc.experience_years} years
                        </span>
                        {Number(doc.total_reviews) > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {Number(doc.rating).toFixed(1)}
                          </span>
                        )}
                        <span>{docStats?.consultations ?? 0} sessions</span>
                        <span className="font-medium text-green-600">{formatPKR(doc.consultation_fee)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => setSelectedDoctor(doc)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {doc.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700"
                          disabled={actionId === doc.id}
                          onClick={() => runAction(doc.id, () => approveDoctor(doc.id, profile.id))}
                        >
                          {actionId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          disabled={actionId === doc.id}
                          onClick={() => runAction(doc.id, () => rejectDoctor(doc.id))}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {doc.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        disabled={actionId === doc.id}
                        onClick={() => runAction(doc.id, () => suspendDoctor(doc.id))}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                    {(doc.status === "suspended" || doc.status === "rejected") && (
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        disabled={actionId === doc.id}
                        onClick={() => runAction(doc.id, () => reinstateDoctor(doc.id, profile.id))}
                      >
                        {actionId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Reinstate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredDoctors.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                <p className="text-sm font-medium text-slate-900">No doctors found</p>
                <p className="text-sm text-slate-600 mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDoctor(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-xl">
                    {initials(selectedDoctor.profile?.full_name)}
                  </div>
                  <div>
                    <CardTitle>{selectedDoctor.profile?.full_name ?? "Unnamed doctor"}</CardTitle>
                    <CardDescription>{selectedDoctor.specialization}</CardDescription>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedDoctor.status)}`}>
                      {selectedDoctor.status}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDoctor(null)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Rating</div>
                  <div className="text-xl font-bold flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    {Number(selectedDoctor.rating).toFixed(1)}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Completed Sessions</div>
                  <div className="text-xl font-bold">{statsByDoctor.get(selectedDoctor.id)?.consultations ?? 0}</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Experience</div>
                  <div className="text-xl font-bold">{selectedDoctor.experience_years} years</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Consultation Fee</div>
                  <div className="text-xl font-bold">{formatPKR(selectedDoctor.consultation_fee)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="font-medium">{selectedDoctor.profile?.email ?? "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="font-medium">{selectedDoctor.profile?.phone ?? "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">PMDC Number</div>
                    <div className="font-medium">{selectedDoctor.pmdc_number}</div>
                  </div>
                </div>
                {selectedDoctor.bio && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Bio</div>
                    <div className="text-sm text-slate-700">{selectedDoctor.bio}</div>
                  </div>
                )}
                {selectedDoctor.rejection_reason && selectedDoctor.status !== "approved" && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="text-xs text-red-600 mb-1">Status note</div>
                    <div className="text-sm text-red-700">{selectedDoctor.rejection_reason}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {selectedDoctor.status === "pending" && (
                  <>
                    <Button
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                      disabled={actionId === selectedDoctor.id}
                      onClick={() => runAction(selectedDoctor.id, () => approveDoctor(selectedDoctor.id, profile.id))}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Doctor
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      disabled={actionId === selectedDoctor.id}
                      onClick={() => runAction(selectedDoctor.id, () => rejectDoctor(selectedDoctor.id))}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {selectedDoctor.status === "approved" && (
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    disabled={actionId === selectedDoctor.id}
                    onClick={() => runAction(selectedDoctor.id, () => suspendDoctor(selectedDoctor.id))}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend Account
                  </Button>
                )}
                {(selectedDoctor.status === "suspended" || selectedDoctor.status === "rejected") && (
                  <Button
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                    disabled={actionId === selectedDoctor.id}
                    onClick={() => runAction(selectedDoctor.id, () => reinstateDoctor(selectedDoctor.id, profile.id))}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reinstate Doctor
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
