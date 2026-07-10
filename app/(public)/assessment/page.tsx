"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Heart,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  Send,
  RefreshCw,
  Shield,
  ArrowRight,
  LogIn,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { createClient } from "@/lib/supabase/client";
import { getApprovedDoctors } from "@/lib/patient/api";
import { saveAssessment, shareAssessmentWithDoctors } from "@/lib/assessment/api";
import type { DoctorWithProfile } from "@/lib/patient/types";
import type { AssessmentResponse } from "@/types/assessment";

// Test Definitions
const ANXIETY_TEST = {
  type: "anxiety" as const,
  title: "PROMIS Emotional Distress — Anxiety Short Form",
  subtitle: "Adult self-screening tool for anxiety level assessment",
  description: "Bothered by symptoms in the past 7 days",
  questions: [
    "I felt fearful.",
    "I felt anxious.",
    "I felt worried.",
    "I found it hard to focus on anything other than my anxiety.",
    "I felt nervous.",
    "I felt uneasy.",
    "I felt tense.",
  ],
  scale: [
    { label: "Never", score: 1 },
    { label: "Rarely", score: 2 },
    { label: "Sometimes", score: 3 },
    { label: "Often", score: 4 },
    { label: "Always", score: 5 },
  ],
  calculateResult: (totalScore: number) => {
    if (totalScore < 19.5) {
      return {
        severity: "healthy" as const,
        title: "No Anxiety / Healthy Anxiety",
        description: "Your test results revealed that you have a normal anxiety level, which is good. A healthy level of anxiety helps you perform better. Anxious people are naturally highly intelligent, good researchers, critical thinkers, and analyzers.",
        suggestedSpecialty: "None (Healthy range)",
      };
    } else if (totalScore >= 19.5 && totalScore <= 21) {
      return {
        severity: "mild" as const,
        title: "Mild Anxiety",
        description: "Your test results revealed that you have some little bit of anxiety. This level of anxiety can be beneficial for you and might increase your productivity. Anxious people are naturally highly intelligent, good researchers, critical thinkers, and analyzers. If you want to explore further, we recommend consulting our experts.",
        suggestedSpecialty: "Psychologist",
      };
    } else if (totalScore > 21 && totalScore <= 24.5) {
      return {
        severity: "moderate" as const,
        title: "Moderate Anxiety",
        description: "Your test results revealed that you are facing some serious anxiety which can be a result from any reason. Anxiety symptoms include nightmares, panic attacks, and uncontrollable unpleasant thoughts or memories. If anxiety isn't managed, it will only get worse. We recommend consulting a psychologist.",
        suggestedSpecialty: "Psychologist / Counselor",
      };
    } else {
      return {
        severity: "severe" as const,
        title: "Severe Anxiety",
        description: "Your test results revealed that you have a high level of anxiety. Anxiety symptoms include nightmares, panic attacks, and uncontrollable unpleasant thoughts or memories. You may have a general feeling of fear and worry, or you may fear a specific place or event. We strongly recommend consulting a psychiatrist or professional therapist.",
        suggestedSpecialty: "Psychiatrist / Senior Clinical Psychologist",
      };
    }
  },
};

const ANGER_TEST = {
  type: "anger" as const,
  title: "PROMIS Emotional Distress — Anger Short Form",
  subtitle: "Adult self-screening tool for anger level assessment",
  description: "Bothered by symptoms in the past 7 days",
  questions: [
    "I was irritated more than people knew.",
    "I felt angry.",
    "I felt like I was ready to explode.",
    "I was grouchy.",
    "I felt annoyed.",
  ],
  scale: [
    { label: "Never", score: 1 },
    { label: "Rarely", score: 2 },
    { label: "Sometimes", score: 3 },
    { label: "Often", score: 4 },
    { label: "Always", score: 5 },
  ],
  calculateResult: (totalScore: number) => {
    if (totalScore < 13) {
      return {
        severity: "healthy" as const,
        title: "No Anger / Healthy Anger",
        description: "You have a healthy level of anger which is productive and beneficial for you. Most people have minor outbursts of rage that don't have a significant impact on their life. It is critical for our emotional and physical health to learn appropriate strategies to recognize, express, and cope with anger. To control outbursts, practice simple breathing: Inhale deeply, hold for 10s, exhale gently. Repeat 7 times.",
        suggestedSpecialty: "None (Healthy range)",
      };
    } else if (totalScore >= 13 && totalScore <= 16) {
      return {
        severity: "mild" as const,
        title: "Mild Anger",
        description: "Your anger level is a little bit higher than normal range which can be due to many reasons. It can be beneficial or a little bit harmful for you. We recommend learning relaxation therapy techniques and simple breathing exercises: Inhale deeply with your nose, hold for 10 seconds, then gently release through your mouth.",
        suggestedSpecialty: "Counselor",
      };
    } else if (totalScore > 16 && totalScore <= 20) {
      return {
        severity: "moderate" as const,
        title: "Moderate Anger",
        description: "Your anger level is a bit higher, which can be harmful for you if left unresolved. When you can't control your anger and it affects those around you, it becomes dangerous. We recommend consulting a psychologist or counselor to explore coping strategies.",
        suggestedSpecialty: "Psychologist / Counselor",
      };
    } else {
      return {
        severity: "severe" as const,
        title: "Severe Anger",
        description: "Your results showed that you are facing a severe level of anger which can be harmful for your health, mental health, and relationships. If your anger is mismanaged, it will either destroy you if you do not express it, or destroy your relationships if you do. We sincerely recommend you consult a professional psychologist or psychiatrist.",
        suggestedSpecialty: "Psychiatrist / Senior Counselor",
      };
    }
  },
};

export default function PublicAssessmentPage() {
  const router = useRouter();
  const [selectedTest, setSelectedTest] = useState<typeof ANXIETY_TEST | typeof ANGER_TEST | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Auth state
  const [isPatientLoggedIn, setIsPatientLoggedIn] = useState(false);

  // Results & Sharing State
  const [savedReport, setSavedReport] = useState<any | null>(null);
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [sharedSuccessfully, setSharedSuccessfully] = useState(false);

  // Check auth and load doctors
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data && (data as any).role === "patient") {
              setIsPatientLoggedIn(true);
            }
          });
      }
    });

    (async () => {
      try {
        const docList = await getApprovedDoctors();
        setDoctors(docList);
      } catch (err) {
        console.error("Failed to load doctors", err);
      }
    })();
  }, []);

  const handleStartTest = (test: typeof ANXIETY_TEST | typeof ANGER_TEST) => {
    setSelectedTest(test);
    setCurrentQuestionIndex(0);
    setAnswers(new Array(test.questions.length).fill(0));
    setSavedReport(null);
    setSharedSuccessfully(false);
    setSelectedDoctors([]);
  };

  const handleSelectAnswer = (score: number) => {
    const nextAnswers = [...answers];
    nextAnswers[currentQuestionIndex] = score;
    setAnswers(nextAnswers);

    // Auto advance
    if (currentQuestionIndex < (selectedTest?.questions.length ?? 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTest) return;
    setLoading(true);

    try {
      const totalScore = answers.reduce((a, b) => a + b, 0);
      const calculated = selectedTest.calculateResult(totalScore);

      const responses: AssessmentResponse[] = selectedTest.questions.map((q, idx) => {
        const score = answers[idx];
        const answerText = selectedTest.scale.find((s) => s.score === score)?.label ?? "";
        return { question: q, score, answerText };
      });

      // Save to database only if logged in
      let dbRecord = null;
      if (isPatientLoggedIn) {
        try {
          dbRecord = await saveAssessment({
            testType: selectedTest.type,
            responses,
            totalScore,
            severity: calculated.severity,
          });
        } catch (dbErr) {
          console.error("Could not save to DB (even though logged in):", dbErr);
        }
      }

      setSavedReport({
        id: dbRecord?.id ?? "guest-report",
        test_type: selectedTest.type,
        responses,
        total_score: totalScore,
        severity: calculated.severity,
        created_at: dbRecord?.created_at ?? new Date().toISOString(),
        resultDetails: calculated,
      });
    } catch (err) {
      console.error("Failed to run assessment scoring", err);
      alert("There was an error scoring your test. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!savedReport || selectedDoctors.length === 0 || savedReport.id === "guest-report") return;
    setSharing(true);
    try {
      await shareAssessmentWithDoctors(savedReport.id, selectedDoctors);
      setSharedSuccessfully(true);
    } catch (err) {
      console.error("Failed to share assessment", err);
      alert("Error sharing report. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleToggleDoctor = (id: string) => {
    if (selectedDoctors.includes(id)) {
      setSelectedDoctors(selectedDoctors.filter((dId) => dId !== id));
    } else {
      setSelectedDoctors([...selectedDoctors, id]);
    }
  };

  // 1. Selector Mode
  if (!selectedTest) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 py-14 space-y-10">

          {/* ── Hero ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">Self-Screening</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
              Mental Health<br />Assessments
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-xl">
              Answer a few short questions to understand your current mental state. You'll get an instant result with personalised guidance.
            </p>
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-slate-100" />

          {/* ── Assessment Cards ── */}
          <div className="grid gap-5 sm:grid-cols-2">

            {/* Anxiety Card */}
            <button
              onClick={() => handleStartTest(ANXIETY_TEST)}
              className="group text-left w-full rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-400 hover:shadow-lg hover:shadow-brand-500/8 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <div className="space-y-5">
                {/* Icon + badge */}
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-brand-50 border border-brand-100 group-hover:bg-brand-100 transition-colors">
                    <Heart className="h-5 w-5 text-brand-600" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    7 questions
                  </span>
                </div>

                {/* Title + desc */}
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                    Anxiety Assessment
                  </h2>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Screens for feelings of fear, worry, tension, and nervousness over the past 7 days.
                  </p>
                </div>

                {/* Tags */}
                <div className="flex gap-2">
                  {["~2 min", "PROMIS SF"].map((tag) => (
                    <span key={tag} className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA row */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-sm font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
                    Start test
                  </span>
                  <ChevronRight className="h-4 w-4 text-brand-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* Anger Card */}
            <button
              onClick={() => handleStartTest(ANGER_TEST)}
              className="group text-left w-full rounded-2xl border border-slate-200 bg-white p-6 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/8 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <div className="space-y-5">
                {/* Icon + badge */}
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 group-hover:bg-rose-100 transition-colors">
                    <Activity className="h-5 w-5 text-rose-600" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    5 questions
                  </span>
                </div>

                {/* Title + desc */}
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                    Anger Assessment
                  </h2>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Evaluates irritation, grouchiness, annoyance, and readiness to explode over the past week.
                  </p>
                </div>

                {/* Tags */}
                <div className="flex gap-2">
                  {["~1.5 min", "PROMIS SF"].map((tag) => (
                    <span key={tag} className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA row */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-sm font-semibold text-rose-600 group-hover:text-rose-700 transition-colors">
                    Start test
                  </span>
                  <ChevronRight className="h-4 w-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          </div>

          {/* ── Footer note ── */}
          <p className="text-center text-xs text-slate-400">
            Clinically validated · PROMIS® Standard · Results are instant and private
          </p>

        </div>
      </div>
    );
  }

  // 2. Active Quiz Mode
  if (!savedReport) {
    const isCompleted = answers.every((a) => a > 0);
    const progress = Math.round(((currentQuestionIndex + 1) / selectedTest.questions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto p-4 py-8">
        <Card className="shadow-lg border-brand-100 bg-white rounded-2xl">
          <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTest(null)}
                className="text-slate-500 hover:text-slate-900 gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                Question {currentQuestionIndex + 1} of {selectedTest.questions.length}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-800">
                {selectedTest.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedTest.description}
              </CardDescription>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-brand-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="pt-8 space-y-8">
            <div className="text-center space-y-4">
              <p className="text-xs text-brand-500 tracking-widest uppercase font-semibold">In the past 7 days...</p>
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 px-4">
                &ldquo;{selectedTest.questions[currentQuestionIndex]}&rdquo;
              </h3>
            </div>

            <div className="grid gap-2.5 max-w-md mx-auto">
              {selectedTest.scale.map((opt) => {
                const isSelected = answers[currentQuestionIndex] === opt.score;
                return (
                  <button
                    key={opt.score}
                    onClick={() => handleSelectAnswer(opt.score)}
                    className={`w-full py-3.5 px-6 rounded-xl border text-left font-medium text-sm transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-100 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-xs text-slate-400 font-bold bg-slate-100 h-6 w-6 rounded-full flex items-center justify-center">
                      {opt.score}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className="gap-1.5 cursor-pointer rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>

              {currentQuestionIndex === selectedTest.questions.length - 1 && isCompleted ? (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-brand-500 hover:bg-brand-600 text-white gap-2 shadow-lg shadow-brand-400/20 cursor-pointer rounded-xl"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Submit & View Report</span>
                      <CheckCircle className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (currentQuestionIndex < selectedTest.questions.length - 1) {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    }
                  }}
                  disabled={answers[currentQuestionIndex] === 0}
                  className="gap-1.5 text-brand-600 cursor-pointer rounded-xl"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Result & Sharing Mode
  const { resultDetails } = savedReport;
  const severityColors = {
    healthy: "text-green-600 bg-green-50 border-green-200",
    mild: "text-blue-600 bg-blue-50 border-blue-200",
    moderate: "text-amber-600 bg-amber-50 border-amber-200",
    severe: "text-red-600 bg-red-50 border-red-200",
  };

  const severityBg = {
    healthy: "from-green-500 to-emerald-600",
    mild: "from-blue-500 to-indigo-600",
    moderate: "from-amber-500 to-orange-500",
    severe: "from-red-500 to-rose-600",
  };

  const isGuestReport = savedReport.id === "guest-report";

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 py-8">
      {/* Result Hero */}
      <div className={`bg-gradient-to-r ${severityBg[savedReport.severity as keyof typeof severityBg]} rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4`}>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-8 w-8 text-white animate-bounce" />
          <h2 className="text-2xl sm:text-3xl font-bold">Assessment Submitted!</h2>
        </div>
        <div className="border-t border-white/20 pt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-white/70">Test Taken:</span>{" "}
            <span className="font-semibold">{selectedTest.title}</span>
          </div>
          <div>
            <span className="text-white/70">Date:</span>{" "}
            <span className="font-semibold">{new Date(savedReport.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left side: Report summary & score */}
        <div className="md:col-span-7 space-y-6">
          <Card className="bg-white rounded-2xl border border-slate-100">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base sm:text-lg">Assessment Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Score</h4>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">
                    {savedReport.total_score}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Range: {selectedTest.type === "anxiety" ? "7 - 35" : "5 - 25"}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl border text-center font-bold text-sm ${severityColors[savedReport.severity as keyof typeof severityColors]}`}>
                  {resultDetails.title}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-700">Clinical Evaluation:</h4>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed bg-brand-50/30 p-4 rounded-xl border border-brand-100/50">
                  {resultDetails.description}
                </p>
              </div>

              {selectedTest.type === "anger" && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <h4 className="font-semibold text-sm text-slate-700">Recommended Breathing Exercise:</h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-red-50/20 p-3 rounded-lg border border-red-100/40">
                    Inhale deeply through your nose, hold the breath for 10 seconds, and then gently release (exhale) through only your mouth. Repeat the procedure 7 times. This exercise will help you to relax and give your mind enough oxygen to think clearly.
                  </p>
                </div>
              )}

              {/* Full breakdown */}
              <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-sm text-slate-700">Your Responses:</h4>
                <div className="space-y-2">
                  {savedReport.responses.map((resp: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <span className="font-medium text-slate-700 pr-4">{i + 1}. {resp.question}</span>
                      <span className="font-semibold text-brand-600 shrink-0 bg-brand-50 px-2 py-0.5 rounded">
                        {resp.answerText} ({resp.score})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side: Suggested Specialist & Share report */}
        <div className="md:col-span-5 space-y-6">
          <Card className="border border-brand-100 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-brand-50/50 pb-4 border-b border-brand-100/50">
              <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-brand-600" />
                <span>Suggested Specialization</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="text-center py-2">
                <span className="text-xs text-slate-500">Recommended Care:</span>
                <p className="text-lg font-bold text-brand-600 mt-0.5">{resultDetails.suggestedSpecialty}</p>
              </div>

              {isGuestReport ? (
                /* Unauthenticated Sharing Prompt */
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-100 text-center space-y-2.5">
                    <p className="text-xs font-semibold text-slate-800">
                      Want to share this report with our professional psychologists or psychiatrists?
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Register or log in to a free Patient account to instantly share your screening scores and receive clinical recommendations from verified specialists.
                    </p>
                    <div className="flex gap-2 justify-center pt-1.5">
                      <Link href="/login" className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1 h-8 rounded-lg"
                        >
                          <LogIn className="h-3 w-3" />
                          <span>Login</span>
                        </Button>
                      </Link>
                      <Link href="/register" className="flex-1">
                        <Button
                          size="sm"
                          className="w-full bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1 h-8 rounded-lg"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>Sign Up</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                /* Authenticated Sharing Widget */
                doctors.length > 0 ? (
                  <div className="space-y-4">
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">Share this report with our experts:</p>
                      {sharedSuccessfully ? (
                        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center space-y-2">
                          <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                          <h5 className="font-semibold text-green-800 text-xs">Report Shared Successfully!</h5>
                          <p className="text-[10px] text-green-700">
                            Selected doctor(s) can now view this report. They will add recommendations which will show up in your history.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {doctors.map((doc) => {
                            const isSelected = selectedDoctors.includes(doc.id);
                            const matchesSpecialization =
                              resultDetails.suggestedSpecialty.toLowerCase().includes(doc.specialization.toLowerCase()) ||
                              (doc.specialization.toLowerCase() === "psychologist" && resultDetails.suggestedSpecialty.includes("Counselor"));

                            return (
                              <div
                                key={doc.id}
                                onClick={() => handleToggleDoctor(doc.id)}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? "border-brand-500 bg-brand-50/50 shadow-sm"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <UserAvatar
                                    name={doc.profile?.full_name ?? "Doctor"}
                                    avatarUrl={doc.profile?.avatar_url ?? null}
                                    size="sm"
                                    className="h-8 w-8 animate-in fade-in"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1">
                                      <p className="text-xs font-semibold truncate">{doc.profile?.full_name}</p>
                                      {matchesSpecialization && (
                                        <span className="text-[8px] bg-brand-100 text-brand-700 px-1 rounded font-bold shrink-0">
                                          Recommended
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate">{doc.specialization}</p>
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 mr-1 cursor-pointer"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {!sharedSuccessfully && (
                      <Button
                        onClick={handleShare}
                        disabled={sharing || selectedDoctors.length === 0}
                        className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2 shadow-md shadow-brand-400/20 text-xs h-9 rounded-lg cursor-pointer"
                      >
                        {sharing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Share Report with {selectedDoctors.length} Doctor(s)</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">No active doctors available to share with at the moment.</p>
                )
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => handleStartTest(selectedTest)}
              className="flex-1 text-xs gap-1.5 h-9 rounded-lg cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retake Test</span>
            </Button>
            <Button
              onClick={() => setSelectedTest(null)}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs gap-1.5 h-9 rounded-lg cursor-pointer"
            >
              <span>Take Another Test</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {isPatientLoggedIn && (
            <Button
              variant="ghost"
              onClick={() => router.push("/patient/assessments")}
              className="w-full text-slate-500 hover:text-slate-800 text-xs h-8 cursor-pointer"
            >
              Go to Assessment History
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
