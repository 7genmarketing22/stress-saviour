"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  CheckCircle,
  Loader2,
  FileText,
  Send,
  Search,
  ChevronRight,
  Sparkles,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useDoctor } from "@/contexts/DoctorContext";
import { getDoctorSharedReports, submitDoctorReview } from "@/lib/assessment/api";

const severityConfig = {
  healthy: {
    label: "Healthy",
    classes: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  mild: {
    label: "Mild",
    classes: "text-blue-700 bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },
  moderate: {
    label: "Moderate",
    classes: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  severe: {
    label: "Severe",
    classes: "text-red-700 bg-red-50 border-red-200",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
};

export default function DoctorAssessmentsPage() {
  const { doctorProfile } = useDoctor();
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShare, setSelectedShare] = useState<any | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "new" | "reviewed">("all");

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadSharedReports = async () => {
    if (!doctorProfile?.id) return;
    setLoading(true);
    try {
      const data = await getDoctorSharedReports(doctorProfile.id);
      setShares(data);
    } catch (err) {
      console.error("Failed to load shared reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSharedReports();
  }, [doctorProfile?.id]);

  const handleSelectReport = (share: any) => {
    setSelectedShare(share);
    setNotes(share.doctor_notes || "");
    setSuccessMsg("");
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShare || !notes.trim()) return;
    setSubmitting(true);
    setSuccessMsg("");

    try {
      await submitDoctorReview(selectedShare.id, notes.trim());
      setSuccessMsg("Recommendation notes submitted successfully!");

      const updatedShares = shares.map((s) => {
        if (s.id === selectedShare.id) {
          return { ...s, doctor_notes: notes.trim(), status: "reviewed", reviewed_at: new Date().toISOString() };
        }
        return s;
      });
      setShares(updatedShares);
      setSelectedShare({
        ...selectedShare,
        doctor_notes: notes.trim(),
        status: "reviewed",
        reviewed_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to save recommendations", err);
      alert("Error saving recommendations. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = shares.filter((s) => s.status !== "reviewed").length;
  const reviewedCount = shares.filter((s) => s.status === "reviewed").length;
  const totalCount = shares.length;
  const reviewRate = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  const filteredShares = shares.filter((s) => {
    const patientName = s.assessment?.patient?.full_name ?? "";
    const matchSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter =
      activeFilter === "all" ||
      (activeFilter === "new" && s.status !== "reviewed") ||
      (activeFilter === "reviewed" && s.status === "reviewed");
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-brand-500" />
        <p className="text-sm text-slate-400">Loading patient reports…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 pb-8">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Assessment Registry</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review self-screening reports shared by patients and submit clinical recommendations.
          </p>
        </div>
        <button
          onClick={loadSharedReports}
          className="inline-flex items-center gap-2 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3.5 py-2 rounded-lg transition-colors self-start md:self-auto"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Refresh Reports
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-slate-800 leading-none">{totalCount}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Total Reports</p>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 to-transparent pointer-events-none" />
          <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 relative">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0 relative">
            <p className="text-2xl font-extrabold text-amber-700 leading-none">{pendingCount}</p>
            <p className="text-xs text-amber-600 mt-1 font-medium">Pending Review</p>
          </div>
          {pendingCount > 0 && (
            <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>

        {/* Reviewed */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 to-transparent pointer-events-none" />
          <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 relative">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0 relative">
            <p className="text-2xl font-extrabold text-emerald-700 leading-none">{reviewedCount}</p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">Reviewed</p>
          </div>
        </div>

        {/* Review Rate */}
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/60 to-transparent pointer-events-none" />
          <div className="h-11 w-11 rounded-xl bg-brand-100 flex items-center justify-center shrink-0 relative">
            <BarChart3 className="h-5 w-5 text-brand-600" />
          </div>
          <div className="min-w-0 relative">
            <p className="text-2xl font-extrabold text-brand-700 leading-none">{reviewRate}%</p>
            <p className="text-xs text-brand-600 mt-1 font-medium">Review Rate</p>
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid gap-5 lg:grid-cols-12">

        {/* LEFT: Search & Report List */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="shadow-sm border-slate-100">
            <CardHeader className="pb-3 border-b border-slate-50">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-sm font-bold text-slate-800">Shared Reports</CardTitle>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredShares.length} shown
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 bg-slate-50/50"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1.5 mt-2">
                {(["all", "new", "reviewed"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all capitalize ${
                      activeFilter === f
                        ? "bg-brand-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {f === "all" ? `All (${totalCount})` : f === "new" ? `Pending (${pendingCount})` : `Reviewed (${reviewedCount})`}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="px-2 pb-2 pt-2">
              {filteredShares.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Filter className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">No reports found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search or filter.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
                  {filteredShares.map((share) => {
                    const patient = share.assessment?.patient;
                    const assessment = share.assessment;
                    if (!patient || !assessment) return null;

                    const dateStr = new Date(share.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                    const isSelected = selectedShare?.id === share.id;
                    const isReviewed = share.status === "reviewed";
                    const sev = severityConfig[assessment.severity as keyof typeof severityConfig];

                    return (
                      <div
                        key={share.id}
                        onClick={() => handleSelectReport(share)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer group ${
                          isSelected
                            ? "border-brand-400 bg-brand-50/60 shadow-sm"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50/80 bg-white"
                        }`}
                      >
                        <UserAvatar
                          name={patient.full_name ?? "Patient"}
                          avatarUrl={patient.avatar_url ?? null}
                          size="sm"
                          className="h-9 w-9 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-bold text-slate-800 truncate">{patient.full_name}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              isReviewed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {isReviewed ? "Done" : "New"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-600 capitalize">{assessment.test_type}</span>
                            <span>·</span>
                            <span>{dateStr}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${sev?.classes}`}>
                            {assessment.severity}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Detail View */}
        <div className="lg:col-span-7">
          {selectedShare ? (
            <Card className="shadow-sm border-slate-100">
              {/* Detail Header */}
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={selectedShare.assessment?.patient?.full_name ?? "Patient"}
                      avatarUrl={selectedShare.assessment?.patient?.avatar_url ?? null}
                      size="sm"
                      className="h-11 w-11"
                    />
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800">
                        {selectedShare.assessment?.patient?.full_name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Shared on {new Date(selectedShare.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </CardDescription>
                    </div>
                  </div>
                  {(() => {
                    const sev = severityConfig[selectedShare.assessment?.severity as keyof typeof severityConfig];
                    return (
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${sev?.classes}`}>
                        {selectedShare.assessment?.severity} Range
                      </span>
                    );
                  })()}
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-5">
                {/* Score + Test Panel */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Test Type</p>
                    <h4 className="text-sm font-bold text-slate-800 capitalize">
                      {selectedShare.assessment?.test_type} Screening
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">PROMIS Short Form</p>
                  </div>
                  <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
                    <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-wider mb-1">Total Score</p>
                    <p className="text-3xl font-black text-brand-600 leading-none">{selectedShare.assessment?.total_score}</p>
                    <p className="text-[10px] text-brand-400 mt-0.5">Clinical T-score</p>
                  </div>
                </div>

                {/* Patient Answers */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                    <Brain className="h-4 w-4 text-brand-500" />
                    Patient Responses
                  </h4>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {selectedShare.assessment?.responses?.map((resp: any, i: number) => {
                      const sev = severityConfig[selectedShare.assessment?.severity as keyof typeof severityConfig];
                      return (
                        <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 gap-3">
                          <span className="text-slate-600 font-medium truncate flex-1">
                            <span className="text-slate-400 mr-1.5">{i + 1}.</span>
                            {resp.question}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`h-1.5 w-1.5 rounded-full ${resp.score >= 4 ? sev?.dot : "bg-slate-300"}`} />
                            <span className="font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                              {resp.answerText} ({resp.score})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Clinical Notes Form */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                    <FileText className="h-4 w-4 text-brand-500" />
                    Clinical Evaluation & Recommendations
                  </h4>

                  {selectedShare.status === "reviewed" && selectedShare.doctor_notes && (
                    <div className="mb-3 bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Previously Submitted Recommendation</p>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pl-5">
                        {selectedShare.doctor_notes}
                      </p>
                      <p className="text-[10px] text-slate-400 pl-5">
                        Reviewed on {new Date(selectedShare.reviewed_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSaveFeedback} className="space-y-3">
                    <textarea
                      required
                      rows={5}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add diagnosis, treatment plan, recommended exercises (e.g. CBT exercises, relaxation therapy, deep breathing), or guidance for the patient..."
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all resize-none bg-slate-50/50 placeholder:text-slate-400"
                    />

                    {successMsg && (
                      <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{successMsg}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-slate-400">
                        {notes.trim().length > 0 ? `${notes.trim().length} characters` : "Minimum 10 characters recommended"}
                      </p>
                      <Button
                        type="submit"
                        disabled={submitting || !notes.trim()}
                        className="bg-brand-500 hover:bg-brand-600 text-white gap-2 shadow-md shadow-brand-400/20 text-xs h-9 px-5 rounded-lg"
                      >
                        {submitting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>{selectedShare.status === "reviewed" ? "Update Recommendation" : "Submit Recommendation"}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full min-h-[400px] flex flex-col justify-center items-center text-center p-10 border border-dashed border-slate-200 bg-slate-50/30 shadow-none">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                <Sparkles className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-base font-bold text-slate-700">No Report Selected</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
                Select a patient assessment report from the list on the left to view their response details and submit clinical recommendations.
              </p>
              {pendingCount > 0 && (
                <div className="mt-5 flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-xs font-semibold text-amber-700">
                    {pendingCount} report{pendingCount > 1 ? "s" : ""} awaiting your review
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
