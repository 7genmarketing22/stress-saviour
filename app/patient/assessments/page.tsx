"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain,
  Calendar,
  ClipboardList,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  ArrowRight,
  User,
  Share2,
  FileText,
  Activity,
  Heart,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPatientAssessments } from "@/lib/assessment/api";

const severityConfig = {
  healthy: { label: "Healthy", dot: "bg-emerald-500", text: "text-emerald-700" },
  mild: { label: "Mild", dot: "bg-blue-500", text: "text-blue-700" },
  moderate: { label: "Moderate", dot: "bg-amber-500", text: "text-amber-700" },
  severe: { label: "Severe", dot: "bg-red-500", text: "text-red-700" },
};

const testTypeLabels: Record<string, string> = {
  anxiety: "Anxiety (PROMIS SF)",
  anger: "Anger (PROMIS SF)",
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

  const totalAssessments = assessments.length;
  const anxietyCount = assessments.filter((a) => a.test_type === "anxiety").length;
  const angerCount = assessments.filter((a) => a.test_type === "anger").length;
  const sharedCount = assessments.filter((a) => a.shares && a.shares.length > 0).length;
  const reviewedCount = assessments.filter((a) =>
    a.shares?.some((s: any) => s.status === "reviewed")
  ).length;

  const stats = [
    {
      title: "Total Screenings",
      value: String(totalAssessments),
      description: "Completed assessments",
      icon: FileText,
      color: "text-slate-600 bg-slate-100",
    },
    {
      title: "Anxiety",
      value: String(anxietyCount),
      description: "PROMIS short form",
      icon: Heart,
      color: "text-brand-600 bg-brand-50",
    },
    {
      title: "Anger",
      value: String(angerCount),
      description: "PROMIS short form",
      icon: Activity,
      color: "text-slate-600 bg-slate-100",
    },
    {
      title: "Doctor Reviews",
      value: `${reviewedCount}/${sharedCount}`,
      description: sharedCount > 0 ? "Reviewed of shared" : "None shared yet",
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm text-muted-foreground">Loading your assessments…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Assessments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review your self-screening history and doctor recommendations.
          </p>
        </div>
        <Link href="/assessment">
          <Button className="gap-2 self-start">
            <ClipboardList className="h-4 w-4" />
            New Assessment
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={loadAssessments}
            className="gap-1.5 border-red-200 text-red-700 hover:bg-red-100 shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Stats — matches patient dashboard card pattern */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 leading-none">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 truncate">{stat.description}</p>
                  </div>
                  <div className={`rounded-lg p-2 shrink-0 ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assessment list */}
      {assessments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center text-center py-16 px-6">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">No assessments yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1.5">
              Complete a self-screening to track your mental health over time and share results with your doctor.
            </p>
            <Link href="/assessment" className="mt-5">
              <Button className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Start first assessment
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assessment history</CardTitle>
            <CardDescription>
              {totalAssessments} screening{totalAssessments !== 1 ? "s" : ""} on record
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {assessments.map((assessment) => {
                const isExpanded = expandedId === assessment.id;
                const dateStr = new Date(assessment.created_at).toLocaleDateString("en-PK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const sev = severityConfig[assessment.severity as keyof typeof severityConfig];
                const reviewedShares = assessment.shares?.filter((s: any) => s.status === "reviewed") ?? [];
                const hasReview = reviewedShares.length > 0;
                const isShared = assessment.shares?.length > 0;
                const testLabel = testTypeLabels[assessment.test_type] ?? "Assessment";

                return (
                  <div key={assessment.id}>
                    {/* Row */}
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(assessment.id)}
                      className="w-full text-left px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-medium text-sm text-foreground">{testLabel}</span>
                            {sev && (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${sev.text}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                                {sev.label}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {dateStr}
                            </span>
                            <span>Score {assessment.total_score}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isShared && (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-medium ${
                                hasReview ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {hasReview ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Reviewed
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3.5 w-3.5" />
                                  Awaiting review
                                </>
                              )}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 px-4 sm:px-6 py-5 space-y-5">
                        {/* Responses */}
                        {assessment.responses?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                              Your responses
                            </h4>
                            <div className="rounded-lg border border-border bg-card overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border bg-muted/50">
                                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-8">#</th>
                                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Question</th>
                                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">Answer</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {assessment.responses.map((resp: any, i: number) => (
                                    <tr key={i} className="hover:bg-muted/30">
                                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                                      <td className="px-3 py-2.5 text-sm text-foreground">{resp.question}</td>
                                      <td className="px-3 py-2.5 text-right">
                                        <span className="text-xs font-medium text-foreground">
                                          {resp.answerText}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-1">({resp.score})</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Doctor reviews */}
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                            Doctor reviews
                          </h4>

                          {assessment.shares?.length > 0 ? (
                            <div className="space-y-3">
                              {assessment.shares.map((share: any) => {
                                const docName = share.doctor?.full_name ?? "Specialist";
                                const isReviewed = share.status === "reviewed";

                                return (
                                  <div
                                    key={share.id}
                                    className="rounded-lg border border-border bg-card p-4"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                          <User className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium truncate">{docName}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Shared{" "}
                                            {new Date(share.shared_at ?? share.created_at).toLocaleDateString("en-PK", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                      <span
                                        className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 ${
                                          isReviewed ? "text-emerald-700" : "text-amber-700"
                                        }`}
                                      >
                                        {isReviewed ? (
                                          <>
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Reviewed
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="h-3.5 w-3.5" />
                                            Pending
                                          </>
                                        )}
                                      </span>
                                    </div>

                                    {isReviewed && share.doctor_notes ? (
                                      <div className="mt-3 pt-3 border-t border-border">
                                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                          Recommendations
                                          <span className="font-normal ml-2">
                                            {new Date(share.reviewed_at).toLocaleDateString("en-PK", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            })}
                                          </span>
                                        </p>
                                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                          {share.doctor_notes}
                                        </p>
                                      </div>
                                    ) : !isReviewed ? (
                                      <p className="mt-3 text-xs text-muted-foreground">
                                        Your doctor&apos;s notes will appear here after review.
                                      </p>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Share2 className="h-4 w-4 shrink-0" />
                                Not shared with a doctor yet
                              </div>
                              <Link href="/assessment">
                                <Button size="sm" variant="outline" className="gap-1.5">
                                  Share with doctor
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end pt-1">
                          <Link href="/assessment">
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <RefreshCw className="h-3.5 w-3.5" />
                              Retake test
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
