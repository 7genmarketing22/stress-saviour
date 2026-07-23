"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  CheckCircle,
  Loader2,
  FileText,
  Send,
  Search,
  ClipboardList,
  AlertCircle,
  RefreshCw,
  Flame,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useDoctor } from "@/contexts/DoctorContext";
import { getDoctorSharedReports, submitDoctorReview } from "@/lib/assessment/api";
import { getErrorMessage } from "@/lib/errors";
import type { AssessmentShare, PatientAssessment } from "@/types/assessment";

const severityConfig = {
  healthy: {
    label: "Healthy",
    classes: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  mild: {
    label: "Mild",
    classes: "text-blue-700 bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
  },
  moderate: {
    label: "Moderate",
    classes: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  severe: {
    label: "Severe",
    classes: "text-red-700 bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
} as const;

type ShareRow = AssessmentShare & {
  assessment?: PatientAssessment & {
    patient?: { full_name: string; avatar_url: string | null; email?: string };
  };
};

function formatShareDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatShareDate(iso);
}

function testLabel(type: string | undefined): string {
  if (type === "anxiety") return "Anxiety (GAD-7)";
  if (type === "anger") return "Anger screening";
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : "Assessment";
}

function TestIcon({ type }: { type: string | undefined }) {
  if (type === "anger") return <Flame className="h-3.5 w-3.5 text-rose-500" />;
  return <Activity className="h-3.5 w-3.5 text-brand-500" />;
}

export default function DoctorAssessmentsPage() {
  const { doctorProfile } = useDoctor();
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShare, setSelectedShare] = useState<ShareRow | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "new" | "reviewed">("all");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadSharedReports = async () => {
    if (!doctorProfile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctorSharedReports(doctorProfile.id);
      setShares(data as ShareRow[]);
    } catch (err) {
      console.error("Failed to load shared reports", err);
      setError(getErrorMessage(err, "Failed to load shared reports"));
      setShares([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSharedReports();
  }, [doctorProfile?.id]);

  const pendingCount = shares.filter((s) => s.status !== "reviewed").length;
  const reviewedCount = shares.filter((s) => s.status === "reviewed").length;
  const totalCount = shares.length;

  const filteredShares = useMemo(
    () =>
      shares.filter((s) => {
        const patientName = s.assessment?.patient?.full_name ?? "";
        const matchSearch =
          patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          testLabel(s.assessment?.test_type).toLowerCase().includes(searchTerm.toLowerCase());
        const matchFilter =
          activeFilter === "all" ||
          (activeFilter === "new" && s.status !== "reviewed") ||
          (activeFilter === "reviewed" && s.status === "reviewed");
        return matchSearch && matchFilter && s.assessment?.patient;
      }),
    [shares, searchTerm, activeFilter]
  );

  // Auto-open first pending report; re-select if current choice falls off the filtered list.
  useEffect(() => {
    if (filteredShares.length === 0) {
      setSelectedShare(null);
      return;
    }
    const stillVisible = selectedShare && filteredShares.some((s) => s.id === selectedShare.id);
    if (stillVisible) return;
    const firstPending = filteredShares.find((s) => s.status !== "reviewed");
    const pick = firstPending ?? filteredShares[0];
    setSelectedShare(pick);
    setNotes(pick.doctor_notes ?? "");
  }, [filteredShares, selectedShare]);

  const handleSelectReport = (share: ShareRow) => {
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
      setSuccessMsg("Recommendation saved.");

      const reviewedAt = new Date().toISOString();
      setShares((prev) =>
        prev.map((s) =>
          s.id === selectedShare.id
            ? { ...s, doctor_notes: notes.trim(), status: "reviewed", reviewed_at: reviewedAt }
            : s
        )
      );
      setSelectedShare({
        ...selectedShare,
        doctor_notes: notes.trim(),
        status: "reviewed",
        reviewed_at: reviewedAt,
      });
    } catch (err) {
      console.error("Failed to save recommendations", err);
      alert(getErrorMessage(err, "Error saving recommendations. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm text-muted-foreground">Loading shared reports…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Shared screening reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review patient self-assessments and add clinical recommendations.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSharedReports} className="gap-2 self-start">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Compact stats */}
      <div className="flex flex-wrap gap-2">
        <StatPill label="Total" value={totalCount} />
        <StatPill label="Awaiting review" value={pendingCount} highlight={pendingCount > 0} />
        <StatPill label="Reviewed" value={reviewedCount} />
        {totalCount > 0 && (
          <StatPill
            label="Completion"
            value={`${Math.round((reviewedCount / totalCount) * 100)}%`}
          />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* List */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Inbox</CardTitle>
              <span className="text-xs text-muted-foreground">{filteredShares.length} reports</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by patient or test…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
            </div>
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
              {(
                [
                  ["all", `All (${totalCount})`],
                  ["new", `Pending (${pendingCount})`],
                  ["reviewed", `Done (${reviewedCount})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                    activeFilter === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-2 pb-2">
            {filteredShares.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No reports match your filters.
              </div>
            ) : (
              <ul className="space-y-1 max-h-[min(560px,70vh)] overflow-y-auto">
                {filteredShares.map((share) => {
                  const patient = share.assessment!.patient!;
                  const assessment = share.assessment!;
                  const isSelected = selectedShare?.id === share.id;
                  const isReviewed = share.status === "reviewed";
                  const sev =
                    severityConfig[assessment.severity as keyof typeof severityConfig] ??
                    severityConfig.mild;
                  const when = formatRelativeDate(share.shared_at);

                  return (
                    <li key={share.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectReport(share)}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? "border-brand-300 bg-brand-50/50 dark:bg-brand-950/20"
                            : "border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <UserAvatar
                          name={patient.full_name}
                          avatarUrl={patient.avatar_url}
                          size="sm"
                          className="shrink-0 mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold truncate">
                              {patient.full_name}
                            </span>
                            {!isReviewed && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                New
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <TestIcon type={assessment.test_type} />
                            <span>{testLabel(assessment.test_type)}</span>
                            <span aria-hidden>·</span>
                            <span className="font-medium text-foreground">
                              Score {assessment.total_score}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Shared {when || formatShareDate(share.shared_at)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sev.classes}`}
                        >
                          {sev.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Detail */}
        <div className="lg:col-span-3">
          {selectedShare?.assessment ? (
            <Card className="border-border shadow-sm h-full">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={selectedShare.assessment.patient?.full_name ?? "Patient"}
                      avatarUrl={selectedShare.assessment.patient?.avatar_url ?? null}
                      size="md"
                    />
                    <div>
                      <CardTitle className="text-base">
                        {selectedShare.assessment.patient?.full_name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {testLabel(selectedShare.assessment.test_type)} · shared{" "}
                        {formatShareDate(selectedShare.shared_at)}
                        {selectedShare.status === "reviewed" && selectedShare.reviewed_at && (
                          <> · reviewed {formatShareDate(selectedShare.reviewed_at)}</>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {(() => {
                    const sev =
                      severityConfig[
                        selectedShare.assessment!.severity as keyof typeof severityConfig
                      ] ?? severityConfig.mild;
                    return (
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full border ${sev.classes}`}
                      >
                        {sev.label} range
                      </span>
                    );
                  })()}
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <MetricBox label="Total score" value={String(selectedShare.assessment.total_score)} />
                  <MetricBox
                    label="Questions"
                    value={String(selectedShare.assessment.responses?.length ?? 0)}
                  />
                  <MetricBox
                    label="Status"
                    value={selectedShare.status === "reviewed" ? "Reviewed" : "Pending"}
                    muted={selectedShare.status !== "reviewed"}
                  />
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5" />
                    Patient responses
                  </h4>
                  <div className="rounded-lg border border-border divide-y divide-border max-h-48 overflow-y-auto">
                    {selectedShare.assessment.responses?.map((resp, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm bg-card"
                      >
                        <span className="text-muted-foreground line-clamp-2 flex-1">
                          <span className="text-foreground/50 mr-2">{i + 1}.</span>
                          {resp.question}
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums bg-muted px-2 py-0.5 rounded">
                          {resp.answerText} ({resp.score})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Your clinical notes
                  </h4>

                  {selectedShare.status === "reviewed" && selectedShare.doctor_notes && (
                    <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/20 px-3 py-2.5">
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5 mb-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Last submitted recommendation
                      </p>
                      <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                        {selectedShare.doctor_notes}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSaveFeedback} className="space-y-3">
                    <textarea
                      required
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Diagnosis impression, coping strategies, follow-up plan, or referral guidance for the patient…"
                      className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 resize-none"
                    />
                    {successMsg && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {successMsg}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={submitting || !notes.trim()}
                        className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
                        size="sm"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {selectedShare.status === "reviewed"
                          ? "Update recommendation"
                          : "Submit recommendation"}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-border bg-muted/20">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">Select a report</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1.5 leading-relaxed">
                Choose a screening from the inbox to view responses and add your clinical notes.
              </p>
              {pendingCount > 0 && (
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {pendingCount} awaiting review
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
        highlight
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      <span className={`font-bold tabular-nums ${highlight ? "text-amber-800" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function MetricBox({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </p>
      <p
        className={`text-lg font-bold mt-0.5 tabular-nums ${
          muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
