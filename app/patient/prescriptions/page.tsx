"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PrescriptionCard } from "@/components/patient/PrescriptionCard";
import { usePatient } from "@/contexts/PatientContext";
import { buildPrescriptions, getPatientPrescriptionAppointments } from "@/lib/patient/api";
import { formatDate } from "@/lib/patient/mappers";
import type { PatientPrescription } from "@/lib/patient/types";
import {
  filterPrescriptions,
  getPrescriptionStats,
  getUniqueSpecializations,
  PRESCRIPTION_ITEMS_PER_PAGE,
  printPrescription,
  sortPrescriptions,
  type PrescriptionDateRange,
  type PrescriptionFilterType,
  type PrescriptionSortOption,
} from "@/lib/patient/prescriptions";
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";

const FILTER_TABS: { id: PrescriptionFilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "medication", label: "Medication" },
  { id: "treatment", label: "Treatment" },
  { id: "with_file", label: "With file" },
];

const SORT_OPTIONS: { id: PrescriptionSortOption; label: string }[] = [
  { id: "newest", label: "Most recent" },
  { id: "oldest", label: "Oldest first" },
  { id: "doctor_asc", label: "Doctor A–Z" },
  { id: "doctor_desc", label: "Doctor Z–A" },
];

const DATE_RANGE_OPTIONS: { id: PrescriptionDateRange; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 3 months" },
  { id: "1y", label: "Last year" },
];

export default function PatientPrescriptionsPage() {
  const { profile } = usePatient();
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<PrescriptionFilterType>("all");
  const [sortBy, setSortBy] = useState<PrescriptionSortOption>("newest");
  const [specialization, setSpecialization] = useState("all");
  const [dateRange, setDateRange] = useState<PrescriptionDateRange>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedPrescription, setSelectedPrescription] = useState<PatientPrescription | null>(null);

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apts = await getPatientPrescriptionAppointments();
      setPrescriptions(buildPrescriptions(apts));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prescriptions");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const stats = useMemo(() => getPrescriptionStats(prescriptions), [prescriptions]);
  const specializations = useMemo(
    () => getUniqueSpecializations(prescriptions),
    [prescriptions]
  );

  const filteredPrescriptions = useMemo(() => {
    const filtered = filterPrescriptions(prescriptions, {
      searchQuery,
      filterType,
      specialization,
      dateRange,
    });
    return sortPrescriptions(filtered, sortBy);
  }, [prescriptions, searchQuery, filterType, specialization, dateRange, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPrescriptions.length / PRESCRIPTION_ITEMS_PER_PAGE));
  const indexOfLast = currentPage * PRESCRIPTION_ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - PRESCRIPTION_ITEMS_PER_PAGE;
  const currentItems = filteredPrescriptions.slice(indexOfFirst, indexOfLast);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, sortBy, specialization, dateRange]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const patientName = profile?.full_name ?? undefined;
  const hasActiveFilters =
    searchQuery ||
    filterType !== "all" ||
    specialization !== "all" ||
    dateRange !== "all" ||
    sortBy !== "newest";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setSpecialization("all");
    setDateRange("all");
    setSortBy("newest");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prescriptions Directory</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View clinical notes and prescriptions from your completed consultations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadPrescriptions} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Link href="/patient/appointments">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Appointments
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadPrescriptions}>
            Retry
          </Button>
        </div>
      )}

      {prescriptions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total records", value: stats.total, icon: FileText, color: "text-brand-500 bg-brand-50" },
            { label: "With medication", value: stats.withMedication, icon: Activity, color: "text-emerald-600 bg-emerald-50" },
            { label: "Downloadable files", value: stats.withFile, icon: Download, color: "text-purple-600 bg-purple-50" },
            { label: "New this week", value: stats.recent, icon: Calendar, color: "text-violet-600 bg-violet-50" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className={`rounded-lg p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search doctor, specialty, medication, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as PrescriptionSortOption)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label="Sort prescriptions"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {specializations.length > 1 && (
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Filter by specialty"
              >
                <option value="all">All specialties</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            )}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as PrescriptionDateRange)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label="Filter by date range"
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                    filterType === tab.id
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filteredPrescriptions.length === 0 ? 0 : indexOfFirst + 1}–
        {Math.min(indexOfLast, filteredPrescriptions.length)} of {filteredPrescriptions.length}{" "}
        {filteredPrescriptions.length === 1 ? "record" : "records"}
        {hasActiveFilters && prescriptions.length !== filteredPrescriptions.length && (
          <> (filtered from {prescriptions.length} total)</>
        )}
      </p>

      <div className="space-y-4">
        {currentItems.length > 0 ? (
          currentItems.map((prc) => (
            <PrescriptionCard
              key={prc.id}
              prescription={prc}
              patientName={patientName}
              expanded={expandedIds.has(prc.id)}
              onToggleExpand={() => toggleExpand(prc.id)}
              onViewDetails={() => setSelectedPrescription(prc)}
            />
          ))
        ) : prescriptions.length > 0 ? (
          <div className="py-12 text-center border border-dashed rounded-xl">
            <Search className="h-10 w-10 text-muted-foreground/60 mb-3 mx-auto" />
            <h4 className="font-semibold">No matching prescriptions</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Try adjusting your search or filters to find what you are looking for.
            </p>
            <Button className="mt-4" size="sm" variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="py-16 text-center border border-dashed rounded-xl">
            <FileText className="h-10 w-10 text-muted-foreground/60 mb-3 mx-auto" />
            <h4 className="font-semibold">No prescriptions found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Prescriptions and clinical notes appear here after your doctor completes a session.
            </p>
            <Link href="/patient/appointments">
              <Button className="mt-4" size="sm" variant="outline">
                View Appointments
              </Button>
            </Link>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
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

      {selectedPrescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-lg font-bold">Prescription Details</h3>
                <p className="text-xs text-muted-foreground">
                  Ref: {selectedPrescription.appointmentId.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedPrescription(null)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Doctor</p>
                  <p className="font-semibold">{selectedPrescription.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{selectedPrescription.specialization}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Issued</p>
                  <p className="font-medium">
                    {formatDate(selectedPrescription.date, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {selectedPrescription.prescription && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase font-semibold tracking-wider">
                    Prescribed Medication
                  </p>
                  <div className="p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30">
                    <p className="font-medium text-emerald-800 dark:text-emerald-300">
                      {selectedPrescription.prescription.medication}
                    </p>
                    {selectedPrescription.prescription.dosage && (
                      <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                        {selectedPrescription.prescription.dosage}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedPrescription.clinicalNote && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase font-semibold tracking-wider">
                    {selectedPrescription.prescription ? "Clinical Notes" : "Treatment Plan"}
                  </p>
                  <div className="p-4 rounded-xl border bg-muted/30 text-sm whitespace-pre-wrap">
                    {selectedPrescription.clinicalNote}
                  </div>
                </div>
              )}

              {selectedPrescription.prescriptionUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Attached document</p>
                  <a
                    href={selectedPrescription.prescriptionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-brand-500 hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    Download prescription file
                  </a>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {selectedPrescription.prescriptionUrl ? (
                  <a
                    href={selectedPrescription.prescriptionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                      <Download className="h-4 w-4" />
                      Download file
                    </Button>
                  </a>
                ) : (
                  <Button
                    className="flex-1 gap-2"
                    variant="outline"
                    onClick={() => printPrescription(selectedPrescription, patientName)}
                  >
                    <Printer className="h-4 w-4" />
                    Print summary
                  </Button>
                )}
                <Link href="/patient/appointments" className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <Calendar className="h-4 w-4" />
                    View appointment
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
