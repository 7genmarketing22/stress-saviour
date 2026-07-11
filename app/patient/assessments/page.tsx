"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain,
  Calendar,
  ClipboardList,
  Heart,
  Activity,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  ArrowRight,
  User,
  BarChart3,
  Share2,
  Sparkles,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPatientAssessments } from "@/lib/assessment/api";

const severityConfig = {
  healthy: {
    classes: "text-emerald-700 bg-emerald-50 border-emerald-200",
    bar: "bg-emerald-500",
    light: "bg-emerald-50",
  },
  mild: {
    classes: "text-blue-700 bg-blue-50 border-blue-200",
    bar: "bg-blue-500",
    light: "bg-blue-50",
  },
  moderate: {
    classes: "text-amber-700 bg-amber-50 border-amber-200",
    bar: "bg-amber-500",
    light: "bg-amber-50",
  },
  severe: {
    classes: "text-red-700 bg-red-50 border-red-200",
    bar: "bg-red-500",
    light: "bg-red-50",
  },
};

export default function PatientAssessmentsHistoryPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientAssessments();
      setAssessments(data);
    } catch (err) {
      console.error("Failed to load assessments", err);
      setError("Could not load your assessment history. Please try again.");
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Derived stats
  const totalAssessments = assessments.length;
  const anxietyCount = assessments.filter((a) => a.test_type === "anxiety").length;
  const angerCount = assessments.filter((a) => a.test_type === "anger").length;
  const sharedCount = assessments.filter((a) => a.shares && a.shares.length > 0).length;
  const reviewedCount = assessments.filter((a) =>
    a.shares?.some((s: any) => s.status === "reviewed")
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-brand-500" />
        <p className="text-sm text-slate-400">Loading your assessments…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 pb-8">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Assessments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review your self-screening history and doctor recommendations.
          </p>
        </div>
        <Link href="/assessment">
          <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2 text-xs h-9 rounded-lg shadow-md shadow-brand-400/20 self-start">
            <ClipboardList className="h-3.5 w-3.5" />
            New Assessment
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={loadAssessments}
            className="text-xs gap-1.5 border-red-200 text-red-700 hover:bg-red-100 h-8 shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Total Tests</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 leading-none">{totalAssessments}</p>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Completed self-screenings</p>
        </div>

        {/* Anxiety */}
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/70 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 mb-3 relative">
            <div className="h-9 w-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
              <Heart className="h-4 w-4 text-brand-600" />
            </div>
            <span className="text-xs font-semibold text-brand-600">Anxiety Tests</span>
          </div>
          <p className="text-3xl font-extrabold text-brand-700 leading-none relative">{anxietyCount}</p>
          <p className="text-[10px] text-brand-400 mt-1.5 font-medium relative">PROMIS Short Form</p>
        </div>

        {/* Anger */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/70 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 mb-3 relative">
            <div className="h-9 w-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4 text-rose-600" />
            </div>
            <span className="text-xs font-semibold text-rose-600">Anger Tests</span>
          </div>
          <p className="text-3xl font-extrabold text-rose-700 leading-none relative">{angerCount}</p>
          <p className="text-[10px] text-rose-400 mt-1.5 font-medium relative">PROMIS Short Form</p>
        </div>

        {/* Reviews Received */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/70 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 mb-3 relative">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-emerald-600">Dr. Reviews</span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 leading-none relative">{reviewedCount}</p>
          <p className="text-[10px] text-emerald-500 mt-1.5 font-medium relative">
            of {sharedCount} shared
          </p>
        </div>
      </div>

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <Card className="text-center py-20 border border-dashed border-slate-200 bg-slate-50/30 shadow-none">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Brain className="h-8 w-8 text-slate-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No Assessments Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
                Take a self-screening assessment to get insights on your mental state and share with specialists.
              </p>
            </div>
            <Link href="/assessment">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white text-xs px-6 gap-2 h-9 rounded-lg">
                <Sparkles className="h-3.5 w-3.5" />
                Start First Assessment
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map((assessment) => {
            const isExpanded = expandedId === assessment.id;
            const dateStr = new Date(assessment.created_at).toLocaleDateString("en-PK", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const isAnxiety = assessment.test_type === "anxiety";
            const sev = severityConfig[assessment.severity as keyof typeof severityConfig];
            const reviewedShares = assessment.shares?.filter((s: any) => s.status === "reviewed") ?? [];
            const hasReview = reviewedShares.length > 0;
            const isShared = assessment.shares?.length > 0;

            return (
              <div
                key={assessment.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Card Header Row */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`rounded-xl p-2.5 shrink-0 ${isAnxiety ? "bg-brand-100" : "bg-rose-100"}`}>
                        {isAnxiety
                          ? <Heart className="h-5 w-5 text-brand-600" />
                          : <Activity className="h-5 w-5 text-rose-600" />
                        }
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-800 leading-tight">
                          {isAnxiety ? "Anxiety Assessment" : "Anger Assessment"}
                          <span className="text-[10px] font-normal text-slate-400 ml-1.5">(PROMIS SF)</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-400 text-[11px] mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dateStr}
                          </span>
                          <span>·</span>
                          <span>
                            Score: <strong className="text-slate-600">{assessment.total_score}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Severity badge */}
                      <span className={`px-3 py-1 rounded-full border text-[11px] font-bold capitalize ${sev?.classes}`}>
                        {assessment.severity}
                      </span>

                      {/* Share indicator */}
                      {isShared && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          hasReview
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {hasReview
                            ? <><CheckCircle className="h-3 w-3" /> Reviewed</>
                            : <><Clock className="h-3 w-3" /> Awaiting</>
                          }
                        </span>
                      )}

                      <button
                        onClick={() => handleToggleExpand(assessment.id)}
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 sm:px-5 pb-5 pt-4 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">

                    {/* Responses Grid */}
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5 text-brand-500" />
                        Your Responses
                      </h4>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {assessment.responses?.map((resp: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-white rounded-lg border border-slate-100 gap-2">
                            <span className="text-slate-500 truncate">
                              <span className="text-slate-300 mr-1">{i + 1}.</span>
                              {resp.question}
                            </span>
                            <span className="font-bold text-brand-600 shrink-0 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded text-[10px]">
                              {resp.answerText} ({resp.score})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Doctor Reviews */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-brand-500" />
                        Doctor Reviews
                      </h4>

                      {assessment.shares?.length > 0 ? (
                        <div className="space-y-2.5">
                          {assessment.shares.map((share: any) => {
                            const docName = share.doctor?.full_name ?? "Specialist";
                            const isReviewed = share.status === "reviewed";

                            return (
                              <div key={share.id} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                                      <User className="h-4 w-4 text-brand-500" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-800">{docName}</p>
                                      <p className="text-[10px] text-slate-400">
                                        Shared {new Date(share.shared_at ?? share.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                    isReviewed
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}>
                                    {isReviewed
                                      ? <><CheckCircle className="h-3 w-3" /> Reviewed</>
                                      : <><Clock className="h-3 w-3" /> Awaiting Review</>
                                    }
                                  </span>
                                </div>

                                {isReviewed && share.doctor_notes ? (
                                  <div className="bg-brand-50/40 border border-brand-100 p-3.5 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wide">Doctor&apos;s Recommendations</p>
                                      <span className="text-[9px] text-slate-400">
                                        {new Date(share.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                      {share.doctor_notes}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                    The doctor&apos;s clinical recommendations will appear here once your report has been reviewed.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/40">
                          <div className="flex items-center gap-2.5 text-slate-500">
                            <Share2 className="h-4 w-4 text-slate-400 shrink-0" />
                            <p className="text-xs">Not shared with any doctor yet.</p>
                          </div>
                          <Link href="/assessment">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1.5 text-brand-600 border-brand-200 hover:bg-brand-50 h-8 rounded-lg"
                            >
                              <span>Share with Doctor</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-1">
                      <Link href="/assessment">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5 border-slate-200 h-8 rounded-lg"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retake Test
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
