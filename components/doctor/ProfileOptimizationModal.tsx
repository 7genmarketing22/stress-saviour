"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useChat } from "@/contexts/ChatContext";
import type { ProfileCompletenessResult } from "@/lib/doctor/profileCompleteness";

interface Props {
  completeness: ProfileCompletenessResult;
  doctorName: string;
}

const SESSION_KEY = "profile_opt_dismissed";

export function ProfileOptimizationModal({ completeness, doctorName }: Props) {
  const [visible, setVisible] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { startConversation } = useChat();

  useEffect(() => {
    // Only show when profile is incomplete and not already dismissed this session
    if (completeness.isComplete) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return;

    // Delay 8–10 seconds (random within range)
    const delay = 8000 + Math.random() * 2000;
    timerRef.current = setTimeout(() => setVisible(true), delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [completeness.isComplete]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  };

  const handleMessageAdmin = async () => {
    setNavigating(true);
    try {
      const supabase = createClient();
      const { data: adminId } = await (supabase as any).rpc("get_first_admin_id");
      if (adminId) {
        await startConversation(adminId as string);
      }
      dismiss();
      router.push("/doctor/chat");
    } catch {
      // fallback: just go to chat
      dismiss();
      router.push("/doctor/chat");
    } finally {
      setNavigating(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-indigo-400 to-brand-600" />

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-brand-50 border border-brand-100 shrink-0">
              <Sparkles className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Let us help you stand out, {doctorName.split(" ")[0]}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Your profile is <span className="font-semibold text-amber-600">{completeness.percent}% complete</span>. Patients are more likely to book doctors with full profiles.
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Profile strength</span>
              <span className="text-xs font-bold text-slate-700">{completeness.score}/{completeness.maxScore}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-indigo-500 transition-all duration-500"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
          </div>

          {/* Missing items */}
          {completeness.missing.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">What&apos;s missing</p>
              <div className="space-y-1">
                {completeness.missing.slice(0, 4).map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    {item}
                  </div>
                ))}
                {completeness.missing.length > 4 && (
                  <p className="text-xs text-slate-400 pl-5">+{completeness.missing.length - 4} more items</p>
                )}
              </div>
            </div>
          )}

          {/* What you get */}
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-3.5 space-y-1.5">
            <p className="text-xs font-bold text-brand-700 uppercase tracking-wide">Our team can help you</p>
            {[
              "Write a compelling professional bio",
              "Set the best consultation fees for your specialty",
              "Optimise your profile for patient discovery",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-brand-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={handleMessageAdmin}
              disabled={navigating}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold h-11 rounded-xl gap-2"
            >
              {navigating ? (
                <span className="animate-pulse">Connecting…</span>
              ) : (
                <>
                  Get Help Optimizing My Profile
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <button
              onClick={dismiss}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              Remind me next time I log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
